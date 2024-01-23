import {BoundsObserver} from '@react-ng/bounds-observer';
import type {ForwardedRef} from 'react';
import React, {forwardRef, memo, useCallback, useEffect, useRef, useState} from 'react';
import {Animated} from 'react-native';
import Hoverable from '@components/Hoverable';
import TooltipRenderedOnPageBody from '@components/Tooltip/TooltipRenderedOnPageBody';
import TooltipSense from '@components/Tooltip/TooltipSense';
import type TooltipProps from '@components/Tooltip/types';
import useLocalize from '@hooks/useLocalize';
import usePrevious from '@hooks/usePrevious';
import useWindowDimensions from '@hooks/useWindowDimensions';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import StringUtils from '@libs/StringUtils';
import variables from '@styles/variables';
import CONST from '@src/CONST';
import callOrReturn from '@src/types/utils/callOrReturn';

const hasHoverSupport = DeviceCapabilities.hasHoverSupport();

/**
 * A component used to wrap an element intended for displaying a tooltip. The term "tooltip's target" refers to the
 * wrapped element, which, upon hover, triggers the tooltip to be shown.
 * @param {propTypes} props
 * @returns {ReactNodeLike}
 */

/**
 * Choose the correct bounding box for the tooltip to be positioned against.
 * This handles the case where the target is wrapped across two lines, and
 * so we need to find the correct part (the one that the user is hovering
 * over) and show the tooltip there.
 *
 * @param {Element} target The DOM element being hovered over.
 * @param {number} clientX The X position from the MouseEvent.
 * @param {number} clientY The Y position from the MouseEvent.
 * @return {DOMRect} The chosen bounding box.
 */

function chooseBoundingBox(target: HTMLElement, clientX: number, clientY: number): DOMRect {
    const slop = 5;
    const bbs = target.getClientRects();
    const clientXMin = clientX - slop;
    const clientXMax = clientX + slop;
    const clientYMin = clientY - slop;
    const clientYMax = clientY + slop;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < bbs.length; i++) {
        const bb = bbs[i];
        if (clientXMin <= bb.right && clientXMax >= bb.left && clientYMin <= bb.bottom && clientYMax >= bb.top) {
            return bb;
        }
    }

    // If no matching bounding box is found, fall back to getBoundingClientRect.
    return target.getBoundingClientRect();
}

function Tooltip(
    {
        children,
        numberOfLines = CONST.TOOLTIP_MAX_LINES,
        maxWidth = variables.sideBarWidth,
        text = '',
        renderTooltipContent,
        renderTooltipContentKey = [],
        shouldHandleScroll = false,
        shiftHorizontal = 0,
        shiftVertical = 0,
        forceRenderingBelow = false,
    }: TooltipProps,
    ref: ForwardedRef<BoundsObserver>,
) {
    const {preferredLocale} = useLocalize();
    const {windowWidth} = useWindowDimensions();

    // Is tooltip already rendered on the page's body? happens once.
    const [isRendered, setIsRendered] = useState(false);
    // Is the tooltip currently visible?
    const [isVisible, setIsVisible] = useState(false);
    // The distance between the left side of the wrapper view and the left side of the window
    const [xOffset, setXOffset] = useState(0);
    // The distance between the top of the wrapper view and the top of the window
    const [yOffset, setYOffset] = useState(0);
    // The width and height of the wrapper view
    const [wrapperWidth, setWrapperWidth] = useState(0);
    const [wrapperHeight, setWrapperHeight] = useState(0);

    // Whether the tooltip is first tooltip to activate the TooltipSense
    const isTooltipSenseInitiator = useRef(false);
    const animation = useRef(new Animated.Value(0));
    const isAnimationCanceled = useRef(false);
    const prevText = usePrevious(text);

    const target = useRef<HTMLElement | null>(null);
    const initialMousePosition = useRef({x: 0, y: 0});

    const updateTargetAndMousePosition = useCallback((e: MouseEvent) => {
        if (!(e.currentTarget instanceof HTMLElement)) {
            return;
        }
        target.current = e.currentTarget;
        initialMousePosition.current = {x: e.clientX, y: e.clientY};
    }, []);

    /**
     * Display the tooltip in an animation.
     */
    const showTooltip = useCallback(() => {
        setIsRendered(true);
        setIsVisible(true);

        animation.current.stopAnimation();

        // When TooltipSense is active, immediately show the tooltip
        if (TooltipSense.isActive()) {
            animation.current.setValue(1);
        } else {
            isTooltipSenseInitiator.current = true;
            Animated.timing(animation.current, {
                toValue: 1,
                duration: 140,
                delay: 500,
                useNativeDriver: false,
            }).start(({finished}) => {
                isAnimationCanceled.current = !finished;
            });
        }
        TooltipSense.activate();
    }, []);

    // eslint-disable-next-line rulesdir/prefer-early-return
    useEffect(() => {
        // if the tooltip text changed before the initial animation was finished, then the tooltip won't be shown
        // we need to show the tooltip again
        if (isVisible && isAnimationCanceled.current && text && prevText !== text) {
            isAnimationCanceled.current = false;
            showTooltip();
        }
    }, [isVisible, text, prevText, showTooltip]);

    /**
     * Update the tooltip bounding rectangle
     */
    const updateBounds = (bounds: DOMRect) => {
        if (bounds.width === 0) {
            setIsRendered(false);
        }
        if (!target.current) {
            return;
        }
        // Choose a bounding box for the tooltip to target.
        // In the case when the target is a link that has wrapped onto
        // multiple lines, we want to show the tooltip over the part
        // of the link that the user is hovering over.
        const betterBounds = chooseBoundingBox(target.current, initialMousePosition.current.x, initialMousePosition.current.y);
        if (!betterBounds) {
            return;
        }
        setWrapperWidth(betterBounds.width);
        setWrapperHeight(betterBounds.height);
        setXOffset(betterBounds.x);
        setYOffset(betterBounds.y);
    };

    /**
     * Hide the tooltip in an animation.
     */
    const hideTooltip = useCallback(() => {
        animation.current.stopAnimation();

        if (TooltipSense.isActive() && !isTooltipSenseInitiator.current) {
            animation.current.setValue(0);
        } else {
            // Hide the first tooltip which initiated the TooltipSense with animation
            isTooltipSenseInitiator.current = false;
            Animated.timing(animation.current, {
                toValue: 0,
                duration: 140,
                useNativeDriver: false,
            }).start();
        }

        TooltipSense.deactivate();

        setIsVisible(false);
    }, []);

    const updateTargetPositionOnMouseEnter = useCallback(
        (e: MouseEvent) => {
            updateTargetAndMousePosition(e);
            if (React.isValidElement(children)) {
                children.props.onMouseEnter?.(e);
            }
        },
        [children, updateTargetAndMousePosition],
    );

    // Skip the tooltip and return the children if the text is empty,
    // we don't have a render function or the device does not support hovering
    if ((StringUtils.isEmptyString(text) && renderTooltipContent == null) || !hasHoverSupport) {
        return children;
    }

    return (
        <>
            {isRendered && (
                <TooltipRenderedOnPageBody
                    animation={animation.current}
                    windowWidth={windowWidth}
                    xOffset={xOffset}
                    yOffset={yOffset}
                    targetWidth={wrapperWidth}
                    targetHeight={wrapperHeight}
                    shiftHorizontal={callOrReturn(shiftHorizontal)}
                    shiftVertical={callOrReturn(shiftVertical)}
                    text={text}
                    maxWidth={maxWidth}
                    numberOfLines={numberOfLines}
                    renderTooltipContent={renderTooltipContent}
                    // We pass a key, so whenever the content changes this component will completely remount with a fresh state.
                    // This prevents flickering/moving while remaining performant.
                    key={[text, ...renderTooltipContentKey, preferredLocale].join('-')}
                    forceRenderingBelow={forceRenderingBelow}
                />
            )}

            {
                // Checks if valid element so we can wrap the BoundsObserver around it
                // If not, we just return the primitive children
                React.isValidElement(children) ? (
                    <BoundsObserver
                        enabled={isVisible}
                        onBoundsChange={updateBounds}
                        ref={ref}
                    >
                        <Hoverable
                            onHoverIn={showTooltip}
                            onHoverOut={hideTooltip}
                            shouldHandleScroll={shouldHandleScroll}
                        >
                            {React.cloneElement(children as React.ReactElement, {
                                onMouseEnter: updateTargetPositionOnMouseEnter,
                            })}
                        </Hoverable>
                    </BoundsObserver>
                ) : (
                    children
                )
            }
        </>
    );
}

Tooltip.displayName = 'Tooltip';

export default memo(forwardRef(Tooltip));
