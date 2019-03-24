import React, { PureComponent } from 'react';
import { Keyboard } from 'react-native';
import PropTypes from 'prop-types';
import { getBottomSpace } from 'react-native-iphone-x-helper';

import DetailsModal from '../components/DetailsModal';

import COINiDNotFound from '../dialogs/COINiDNotFound';
import SetupWallet from '../dialogs/SetupWallet';
import SelectAddressType from '../dialogs/SelectAddressType';
import InputPublicKey from '../dialogs/InputPublicKey';
import SelectColdTransportType from '../dialogs/SelectColdTransportType';
import QRDataSender from '../dialogs/QRDataSender';
import ValidateAddress from '../dialogs/ValidateAddress';
import SweepPrivateKey from '../dialogs/SweepPrivateKey';
import SweepKeyDetails from '../dialogs/SweepKeyDetails';
import Receive from '../dialogs/Receive';
import TransactionDetails from '../dialogs/TransactionDetails';
import Send from '../dialogs/Send';
import Sign from '../dialogs/Sign';

import WalletContext from './WalletContext';

const DialogContext = React.createContext({});

export const dialogRoutes = {
  COINiDNotFound: {
    DialogComponent: COINiDNotFound,
    defaultProps: { title: 'COINiD Vault not installed' },
  },
  SetupWallet: {
    DialogComponent: SetupWallet,
    defaultProps: { title: 'Setup your wallet' },
  },
  SelectAddressType: {
    DialogComponent: SelectAddressType,
    defaultProps: { title: 'Select address type' },
  },
  InputPublicKey: {
    DialogComponent: InputPublicKey,
    defaultProps: {
      title: 'Enter Public Key',
      avoidKeyboard: true,
      avoidKeyboardOffset: -getBottomSpace(),
    },
  },
  SelectColdTransportType: {
    DialogComponent: SelectColdTransportType,
    defaultProps: { title: 'Choose how to connect' },
  },
  QRDataSender: {
    DialogComponent: QRDataSender,
    defaultProps: { title: 'QR Transfer to Vault' },
  },
  ValidateAddress: {
    DialogComponent: ValidateAddress,
    defaultProps: { title: 'Validate Address' },
  },
  SweepPrivateKey: {
    DialogComponent: SweepPrivateKey,
    defaultProps: { title: 'Sweep Private Key' },
  },
  SweepKeyDetails: {
    DialogComponent: SweepKeyDetails,
    defaultProps: { title: 'Private Key Details' },
  },
  Receive: {
    DialogComponent: Receive,
    defaultProps: {
      title: 'Receive',
      verticalPosition: 'flex-end',
      showMoreOptions: true,
      avoidKeyboard: true,
      avoidKeyboardOffset: -getBottomSpace(),
    },
  },
  TransactionDetails: {
    DialogComponent: TransactionDetails,
    defaultProps: {
      title: 'Transaction Details',
      verticalPosition: 'flex-end',
      avoidKeyboard: true,
      avoidKeyboardOffset: -getBottomSpace(),
    },
  },
  Send: {
    DialogComponent: Send,
    defaultProps: {
      title: 'Send',
      verticalPosition: 'flex-end',
      avoidKeyboard: true,
      avoidKeyboardOffset: -getBottomSpace(),
    },
  },
  EditTransaction: {
    DialogComponent: Send,
    defaultProps: {
      title: 'Edit transaction',
      verticalPosition: 'flex-end',
      avoidKeyboard: true,
      avoidKeyboardOffset: -getBottomSpace(),
    },
  },
  Sign: {
    DialogComponent: Sign,
    defaultProps: {
      title: 'Sign Transactions',
      verticalPosition: 'flex-end',
      avoidKeyboard: true,
      avoidKeyboardOffset: -getBottomSpace(),
    },
  },
};

class DialogBox extends PureComponent {
  static childContextTypes = {
    theme: PropTypes.string,
  };

  constructor() {
    super();

    this.state = {
      dialogWidth: 0,
      dialogHeight: 0,
      dialogInnerWidth: 0,
      dialogInnerHeight: 0,
      currentDialog: 0,
    };

    this.moreOptionCallbacks = {};

    this.dialogs = [];
  }

  getChildContext() {
    return {
      theme: 'light',
    };
  }

  _updateSetContextBridger = (context) => {
    const { setContextBridger } = context;
    const { currentSetContextBridger } = this;

    if (currentSetContextBridger !== setContextBridger) {
      if (currentSetContextBridger) {
        currentSetContextBridger(undefined); // clear old
        this.currentSetContextBridger = undefined;
      }
      if (setContextBridger) {
        setContextBridger(this._contextBridger);
        this.currentSetContextBridger = setContextBridger;
      }
    }
  };

  _navigateToExistingOrClose = (route) => {
    if (!this._navigateToExisting(route)) {
      this._goBack(999);
    }
  };

  _navigateToExisting = (route) => {
    const [foundDialog] = this.dialogs.filter(e => e.route === route);
    const existIndex = this.dialogs.indexOf(foundDialog);

    if (existIndex !== -1) {
      const times = this.dialogs.length - 1 - existIndex;
      this._removeDialogs(times);
      this._changeDialog();
      return true;
    }
    return false;
  };

  _navigate = (route, customProps = {}, newContext = false, replace = true, removeDialogs = 0) => {
    const { DialogComponent, defaultProps } = dialogRoutes[route];

    if (newContext && newContext !== this.context) {
      this.context = newContext;
      this._updateSetContextBridger(this.context);
      this._contextBridger(this.context);
    }

    const props = { ...defaultProps, ...customProps, dialogRef: this.modal };

    const dialog = {
      DialogComponent,
      props,
      route,
      key: route,
    };

    this._removeDialogs(removeDialogs);

    if (replace) {
      this.dialogs = [dialog];
    } else {
      if (this._navigateToExisting(route)) {
        return;
      }

      this.dialogs.push(dialog);
    }

    this._changeDialog();
  };

  _removeDialogs = (number) => {
    for (let i = 0; i < number; i += 1) {
      this.dialogs.pop();
    }
  };

  _goBack = (times = 1) => {
    this._removeDialogs(times);
    this._changeDialog();
  };

  _changeDialog = () => {
    Keyboard.dismiss();

    this.modal._close(() => {
      const { dialogs } = this;
      const currentDialog = dialogs.length - 1;
      if (currentDialog >= 0) {
        const { props } = dialogs[currentDialog];

        this.setState({ currentDialog, props }, () => {
          this.modal._open();
        });
      }
    });
  };

  _getCurrent = () => {
    const { dialogs } = this;
    const currentDialog = dialogs.length - 1;

    if (currentDialog >= 0) {
      return dialogs[currentDialog];
    }

    return false;
  };

  _contextBridger = (updatedContext) => {
    this.setState({
      context: updatedContext,
    });
  };

  _onLayout = ({ nativeEvent }) => {
    const { layout } = nativeEvent;
    const { width: dialogInnerWidth, height: dialogInnerHeight } = layout;

    this.setState({
      dialogInnerWidth,
      dialogInnerHeight,
    });
  };

  _onOuterLayout = ({ nativeEvent }) => {
    const { layout } = nativeEvent;
    const { width: dialogWidth, height: dialogHeight } = layout;

    this.setState({
      dialogWidth,
      dialogHeight,
    });
  };

  _renderDialogComponent = ({ DialogComponent, props, key }) => {
    const {
      dialogWidth, dialogHeight, dialogInnerWidth, dialogInnerHeight,
    } = this.state;

    return (
      <DialogComponent
        key={key}
        {...props}
        dialogInnerWidth={dialogInnerWidth}
        dialogInnerHeight={dialogInnerHeight}
        dialogWidth={dialogWidth}
        dialogHeight={dialogHeight}
        setMoreOptionsFunc={(moreOptions) => {
          this.moreOptionCallbacks[key] = moreOptions;
        }}
      />
    );
  };

  render() {
    const { dialogs } = this;
    const { currentDialog, context, props } = this.state;

    return (
      <WalletContext.Provider value={context}>
        <DetailsModal
          {...props}
          ref={(c) => {
            this.modal = c;
          }}
          onLayout={this._onLayout}
          onOuterLayout={this._onOuterLayout}
          currentDialog={currentDialog}
          removeWhenClosed={false}
          onMoreOptions={() => {
            const { key } = this._getCurrent();
            if (this.moreOptionCallbacks[key]) {
              this.moreOptionCallbacks[key]();
            }
          }}
        >
          {dialogs.map(this._renderDialogComponent)}
        </DetailsModal>
      </WalletContext.Provider>
    );
  }
}

class DialogBoxProvider extends PureComponent {
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
  };

  static defaultProps = {
    children: null,
  };

  _setRef = (c) => {
    this._dialogBoxRef = c;
    this._dialogNavigate = this._dialogBoxRef._navigate;
    this._dialogNavigateToExisting = this._dialogBoxRef._navigateToExisting;
    this._dialogNavigateToExistingOrClose = this._dialogBoxRef._navigateToExistingOrClose;

    this._dialogGoBack = this._dialogBoxRef._goBack;
    this._dialogGetCurrentDialog = this._dialogBoxRef._getCurrent;
  };

  render() {
    const { children } = this.props;

    return (
      <DialogContext.Provider
        value={{
          dialogNavigate: this._dialogNavigate,
          dialogGoBack: this._dialogGoBack,
          dialogGetCurrentDialog: this._dialogGetCurrentDialog,
          dialogNavigateToExisting: this._dialogNavigateToExisting,
          dialogNavigateToExistingOrClose: this._dialogNavigateToExistingOrClose,
        }}
      >
        {children}
        <DialogBox ref={this._setRef} />
      </DialogContext.Provider>
    );
  }
}

export default {
  ...DialogContext,
  Provider: DialogBoxProvider,
};
