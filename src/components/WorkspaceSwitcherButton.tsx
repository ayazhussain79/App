import React, { useMemo } from 'react';
import useLocalize from '@hooks/useLocalize';
import CONST from '@src/CONST';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import useActiveWorkspace from '@hooks/useActiveWorkspace';
import {getPolicy, getDefaultWorkspaceAvatar} from "@libs/ReportUtils"
import * as Expensicons from './Icon/Expensicons';
import {PressableWithFeedback} from './Pressable';
import SubscriptAvatar from './SubscriptAvatar';

function WorkspaceSwitcherButton() {
    const {translate} = useLocalize();
    const {activeWorkspaceID} = useActiveWorkspace();


    const {source, name, type} = useMemo(() => {

        if(!activeWorkspaceID) {
            return {source: Expensicons.ExpensifyAppIcon, name: CONST.WORKSPACE_SWITCHER.NAME, type: CONST.ICON_TYPE_AVATAR}
        }

        const policy = getPolicy(activeWorkspaceID);
        const avatar = policy?.avatar && policy?.avatar?.length > 0 ? policy.avatar : getDefaultWorkspaceAvatar(policy?.name);
        return {
            source: avatar,
            name: policy?.name,
            type: CONST.ICON_TYPE_WORKSPACE,
        }
    }, [activeWorkspaceID]);


    return (
        <PressableWithFeedback
            accessibilityRole={CONST.ROLE.BUTTON}
            accessibilityLabel={translate('common.workspaces')}
            accessible
            onPress={() => {
                Navigation.navigate(ROUTES.WORKSPACE_SWITCHER);
            }}
        >
            <SubscriptAvatar
                mainAvatar={{source, name, type}}
                subscriptIcon={{source: Expensicons.DownArrow, width: CONST.WORKSPACE_SWITCHER.SUBSCRIPT_ICON_SIZE, height: CONST.WORKSPACE_SWITCHER.SUBSCRIPT_ICON_SIZE}}
                showTooltip={false}
                noMargin
            />
        </PressableWithFeedback>
    );
}

WorkspaceSwitcherButton.displayName = 'WorkspaceSwitcherButton';

export default WorkspaceSwitcherButton;
