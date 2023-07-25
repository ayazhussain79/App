import React, {useRef, useEffect} from 'react';
import {Animated} from 'react-native';
import styles from '../../../styles/styles';
import {propTypes, defaultProps} from './TextInputLabelPropTypes';
import CONST from '../../../CONST';

function TextInputLabel(props) {
    const labelRef = useRef(null);

    useEffect(() => {
        if (!props.for || !labelRef.current) {
            return;
        }
        labelRef.current.setAttribute('for', props.for);
    }, [props.for]);

    return (
        <Animated.Text
            ref={labelRef}
            pointerEvents="none"
            accessibilityRole={CONST.ACCESSIBILITY_ROLE.TEXT}
            style={[styles.textInputLabel, styles.textInputLabelDesktop, styles.textInputLabelTransformation(props.labelTranslateY, 0, props.labelScale)]}
        >
            {props.label}
        </Animated.Text>
    );
}

TextInputLabel.displayName = 'TextInputLabel';
TextInputLabel.propTypes = propTypes;
TextInputLabel.defaultProps = defaultProps;

export default TextInputLabel;
