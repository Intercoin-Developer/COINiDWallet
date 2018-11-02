import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator, TouchableOpacity, SectionList, View, Animated,
} from 'react-native';
import moment from 'moment';
import { Icon } from 'react-native-elements';
import LottieView from 'lottie-react-native';
import Big from 'big.js';
import {
  Graph, Text, TransactionFilter,
} from '..';
import themeableStyles from './styles';
import { numFormat } from '../../utils/numFormat';

import {
  getTxBalanceChange,
} from '../../libs/coinid-public/transactionHelper';

import { colors, fontWeight } from '../../config/styling';

const lottieFiles = {
  emptytrans_hot: require('../../animations/emptytrans_hot.json'),
  emptytrans_cold: require('../../animations/emptytrans_cold.json'),
  feather_cold: require('../../animations/feather_cold.json'),
  feather_hot: require('../../animations/feather_hot.json'),
  hourglass: require('../../animations/hourglass.json'),
};

const activeItems = {};

class TransactionListItem extends Component {
  constructor(props, context) {
    super(props);

    this.noteHelper = context.coinid.noteHelper;

    const { txData, style, confirmations } = this.props;
    const [tx, address, balanceChanged, key] = txData;

    const itemKey = tx.txid + address;
    const { ticker } = context.coinid;

    this.propStyle = style;

    this.state = {
      tx,
      address,
      balanceChanged,
      key,
      confirmations,
      ticker,
      pendingProgress: new Animated.Value(0),
      confirmationOpacity: new Animated.Value(1),
    };

    activeItems[itemKey] = this;
  }

  componentDidMount() {
    const { confirmations } = this.state;

    this._loadNote();
    this._updateConfirmationAnimation(confirmations, true);
  }

  componentWillReceiveProps(nextProps) {
    const { txData, confirmations } = nextProps;
    const [tx, address, balanceChanged, key] = txData;
    const { unPublished } = tx;

    if (confirmations !== this.state.confirmations || unPublished !== this.state.unPublished) {
      this._updateConfirmationAnimation(confirmations);

      this.setState({
        confirmations,
        tx,
        address,
        balanceChanged,
        key,
        unPublished,
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {
      tx, ticker, note, confirmations, unPublished,
    } = nextState;

    if (unPublished !== this.state.unPublished) {
      return true;
    }

    if (note !== this.state.note) {
      return true;
    }

    if (confirmations !== this.state.confirmations) {
      return true;
    }

    return false;
  }

  componentWillUnmount() {
    const { tx, address } = this.state;

    const itemKey = tx.txid + address;
    delete activeItems[itemKey];
  }

  _updateConfirmationAnimation = (confirmations, instant) => {
    const curVal = this.state.pendingProgress._value;


    const newVal = this._percentDone(confirmations);

    Animated.timing(this.state.pendingProgress, {
      toValue: newVal,
      duration: instant ? 0 : 2400 * (newVal - curVal),
    }).start(() => {
      if (this._percentDone(confirmations) === 1) {
        Animated.timing(this.state.confirmationOpacity, {
          toValue: 0,
          duration: instant ? 0 : 400,
        }).start();
      }
    });
  };

  _onPress = (info) => {
    this.props.onPressItem(info);
  };

  _percentDone = (confirmations) => {
    const { confirmations: recommendedConfirmations } = this.context.coinid.network;
    const percentage = parseInt((6 * confirmations / recommendedConfirmations), 10) / 6;

    return percentage > 1 ? 1 : percentage;
  };

  _getDateString = () => {
    const { time } = this.state.tx;

    if (time) {
      return moment.unix(time).format('HH:mm');
    }

    return moment().format('HH:mm');
  };

  _loadNote = () => {
    const { tx, address } = this.state;
    this.noteHelper.loadNote(tx, address).then((note) => {
      if (note !== undefined) {
        this.setState({ note });
      }
    });
  };

  _getStyle = () => {
    const { theme } = this.context;
    return themeableStyles(theme);
  };

  render() {
    const {
      note, tx, address, balanceChanged, key, confirmations,
    } = this.state;

    const styles = this._getStyle();
    const { type, coinid } = this.context;
    const { ticker } = coinid;

    const renderCurrentState = () => {
      const { unPublished } = this.state.tx;
      const { confirmations: recommendedConfirmations } = this.context.coinid.network;
      const { pendingProgress, confirmationOpacity } = this.state;

      if (unPublished) {
        return (
          <View style={{ justifyContent: 'center', marginRight: 14 }}>
            <LottieView
              ref={c => (this.queueAnim = c)}
              onLayout={() => {
                this.queueAnim.play();
              }}
              source={lottieFiles[`feather_${type}`]}
              loop
              style={{
                width: 16,
                height: 16,
              }}
            />
          </View>
        );
      }

      const renderHourglass = () => {
        if (confirmations > recommendedConfirmations) {
          return null;
        }

        return (
          <View style={{ justifyContent: 'center', marginRight: 2, width: 16 }}>
            <View style={{ width: 16, height: 16 }}>
              <LottieView
                style={{}}
                ref={c => (this.progressAnim = c)}
                source={lottieFiles.hourglass}
                loop={false}
                progress={pendingProgress}
              />
            </View>
          </View>
        );
      };

      return (
        <Animated.View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            position: 'absolute',
            right: 46,
            opacity: confirmationOpacity,
          }}
        >
          { renderHourglass() }

          <Text
            style={[styles.smallText, confirmations ? styles.pendingText : styles.unconfirmedText]}
          >
            {`${confirmations}/${recommendedConfirmations}`}
          </Text>
        </Animated.View>
      );
    };

    const renderRow = (tx, address, balanceChanged, key) => {
      const renderBatchLine = () => {
        if (key) {
          return <View style={[styles.batchedLine]} />;
        }
        return null;
      };

      return (
        <View key={key}>
          {renderBatchLine()}
          <TouchableOpacity
            style={{ height: 56, marginVertical: 3 }}
            onPress={() => this._onPress({ tx, address, balanceChanged })}
          >
            <View style={styles.itemContainer}>
              <View style={styles.infoContainer}>
                <View style={[styles.topContainer]}>
                  <Text
                    style={[
                      styles.amountText,
                      balanceChanged > 0 ? styles.positiveAmount : styles.negativeAmount,
                    ]}
                  >
                    {numFormat(balanceChanged, ticker)}
                    {' '}
                    {ticker}
                  </Text>
                  {renderCurrentState()}
                  <Text style={[styles.smallText]}>{this._getDateString()}</Text>
                </View>
                <Text style={[styles.smallText]} ellipsizeMode="middle" numberOfLines={1}>
                  {note || address}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    };

    return renderRow(tx, address, balanceChanged, key);
  }
}

TransactionListItem.contextTypes = {
  type: PropTypes.string,
  theme: PropTypes.string,
  coinid: PropTypes.object,
  settingHelper: PropTypes.object,
};

export default class TransactionList extends PureComponent {
  constructor(props, context) {
    super(props);

    const { transactions } = props;
    const { coinid } = context;

    this.state = {
      listHeight: 0,
      graphHeight: 0,
      headerHeight: 0,
      isFiltersOpen: false,
      txItemsOffset: new Animated.Value(0),
      filterHeight: 0,
    };

    this.filters = {
      text: '',
      type: 'all',
    };

    this.coinid = coinid;

    this.txData = [];
    this.transactions = transactions;
    this.filteredData = this.txData;
    this.dailySummary = {};
    this.sections = [{ data: [], title: 'Transactions' }];
    this.hasFiltered = false;

    this.noteHelper = coinid.noteHelper;
    this.noteHelper.on('savednote', this._onSavedNote);

    this.scrollCurrentY = 0;

    this._parseTransactionsProp(transactions);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isLoadingTxs || !nextProps.transactions) {
      return;
    }

    if (
      this.transactions !== nextProps.transactions
    ) {
      this._parseTransactionsProp(nextProps.transactions);
    }
  }

  _buildTxData = () => {
    const txData = [];
    const addresses = this.coinid.getAllAddresses();

    let i = 0;


    let oldTx;
    const pushTxData = (tx, addr, balance) => {
      if (tx !== oldTx) {
        oldTx = tx;
        i = 0;
      }
      txData.push([tx, addr, balance, i++]);
    };

    this.transactions.forEach((tx) => {
      getTxBalanceChange(tx, addresses);

      // Sent
      if (tx.balanceChanged <= 0) {
        const { length } = txData;

        for (const addr in tx.summaryOther) {
          pushTxData(tx, addr, -tx.summaryOther[addr]);
        }

        // if no tx added, then it was most likely a transaction between internal addresses
        if (txData.length === length) {
          pushTxData(tx, '(internal transaction)', 0);
        }
      } else {
        // Received
        for (const addr in tx.summaryOwn) {
          pushTxData(tx, addr, tx.summaryOwn[addr]);
        }
      }
    });

    return txData;
  };

  _parseTransactionsProp = (transactions) => {
    this.transactions = transactions;
    this.txData = this._buildTxData();
    this._filterTransactions();
  };

  _onSavedNote = (tx, address) => {
    const itemKey = tx.txid + address;
    if (activeItems[itemKey] !== undefined) {
      activeItems[itemKey]._loadNote();
    }
  };

  _filterRow = (data) => {
    const [tx, address, balanceChanged] = data;

    if (this.filters.type === 'received' && balanceChanged <= 0) {
      return false;
    }

    if (this.filters.type === 'sent' && balanceChanged > 0) {
      return false;
    }

    if (this.filters.regex) {
      if (!this.filters.regex.test(tx.txid) && !this.filters.regex.test(address)) {
        const note = this.noteHelper.getCachedNote(tx, address);
        if (!this.filters.regex.test(note)) {
          return false;
        }
      }
    }

    return true;
  };

  _createDailySummary = () => {
    this.dailySummary = {};

    const getDateString = (time) => {
      if (time) {
        return moment.unix(time).format('MMM Do YYYY');
      }

      return moment().format('MMM Do YYYY');
    };

    if (this.filteredData.length) {
      let prevTx = null;
      let accFee = Big(0);
      let prevDate = '';

      for (var i = this.filteredData.length - 1; i >= 0; i--) {
        const [tx, address, balanceChanged] = this.filteredData[i];
        const { time } = tx;

        if (prevTx !== tx) {
          if (prevTx !== null) {
            const date = getDateString(time);

            if (date !== prevDate) {
              this.dailySummary[i + 1] = {
                accFee: Number(accFee),
                date: prevDate,
              };
              accFee = Big(0);
            }
          }

          if (balanceChanged <= 0) {
            accFee = accFee.plus(tx.fees);
          }

          prevTx = tx;
          prevDate = getDateString(time);
        }
      }

      this.dailySummary[i + 1] = {
        accFee: Number(accFee),
        date: prevDate,
      };
    }
  };

  _filterTransactions = () => {
    this.filteredData = this.txData.filter(data => this._filterRow(data));

    let prevHash;
    this.filteredData = this.filteredData.map(([tx, address, balanceChanged, key]) => {
      if (tx.uniqueHash !== prevHash) {
        key = 0;
        prevHash = tx.uniqueHash;
      }

      return [tx, address, balanceChanged, key];
    });

    this._createDailySummary();

    this.hasFiltered = true;
    this.sections[0].data = this.filteredData;
  };

  _onPressItem = (info) => {
    this.props.showTransactionDetails(info);
  };

  _toggleFilters = () => {
    this.setState({ isFiltersOpen: !this.state.isFiltersOpen });
  };

  _filtersChanged = (filters) => {
    this.filters = filters;
    if (filters.text) {
      this.filters.regex = new RegExp(filters.text, 'i');
    } else {
      this.filters.regex = undefined;
    }

    if (this.filterTimeout) clearTimeout(this.filterTimeout);
    this.filterTimeout = setTimeout(() => {
      this._filterTransactions();
      this.forceUpdate();
    }, 0);
  };

  _isScrollWithinArea = (direction) => {
    if (!direction) {
      return this.scrollCurrentY > 0 && this.scrollCurrentY < this.state.graphHeight - 2;
    }
    if (direction === -1) {
      return this.scrollCurrentY > 0;
    }
    if (direction === 1) {
      return this.scrollCurrentY < this.state.graphHeight - 2;
    }
  };

  _scrollToFirst = () => {
    this.sectionRef.scrollToLocation({
      itemIndex: 0,
      sectionIndex: 0,
      viewOffset: this.state.headerHeight,
    });
  };

  _scrollToTop = () => {
    this.sectionRef.scrollToLocation({
      itemIndex: 0,
      sectionIndex: 0,
      viewOffset: this.state.graphHeight + this.state.headerHeight,
    });
  };

  _scrollToFirstTimeout = (direction) => {
    this._clearScrollToFirstTimeout();

    if (this._isScrollWithinArea(direction)) {
      direction = direction || 0;

      if (!direction) {
        if (this.scrollBeginY < this.scrollEndY) direction = 1;
        if (this.scrollBeginY > this.scrollEndY) direction = -1;
        if (direction === 0) {
          direction = this.lastDirection;
        }
      }

      this.lastDirection = direction;

      if (direction === 1) {
        this.scrollTime = setTimeout(() => {
          this._scrollToFirst();
        }, 0);
      }

      if (direction === -1) {
        this.scrollTime = setTimeout(() => {
          this._scrollToTop();
        }, 0);
      }
    }
  };

  _onMomentumScrollBegin = (e) => {
    this.momentumStarted = true;
    this._clearScrollToFirstTimeout();
  };

  _onMomentumScrollEnd = (e) => {
    if (this.momentumStarted) {
      this.momentumStarted = false;
      this._scrollToFirstTimeout();
    }
  };

  _onScrollBeginDrag = (e) => {
    this.scrollBeginY = e.nativeEvent.contentOffset.y;
    this._clearScrollToFirstTimeout();
  };

  _onScrollEndDrag = (e) => {
    this.scrollEndY = e.nativeEvent.contentOffset.y;
    this._scrollToFirstTimeout();
    this.momentumStarted = true;
  };

  _handleScroll = (e) => {
    this.scrollCurrentY = e.nativeEvent.contentOffset.y;
  };

  _clearScrollToFirstTimeout = () => {
    clearTimeout(this.scrollTime);
  };

  _getStyle = () => {
    const { theme } = this.context;
    return themeableStyles(theme);
  };

  _renderItemWrapper = (props) => {
    if (props.cellKey === '0:header') {
      return <Animated.View {...props}>{props.children}</Animated.View>;
    }

    if (props.prevCellKey === '0:header') {
      return (
        <Animated.View {...props} style={{ transform: [{ translateY: this.state.txItemsOffset }], zIndex: 5, marginTop: -this.state.filterHeight }}>
          {props.children}
        </Animated.View>
      );
    }

    return (
      <Animated.View {...props} style={{ transform: [{ translateY: this.state.txItemsOffset }], zIndex: 5 }}>
        {props.children}
      </Animated.View>
    );
  };

  render() {
    const {
      toggleCurrency, toggleRange, isLoadingTxs,
    } = this.props;

    const { type } = this.context;


    const { ticker } = this.context.coinid;


    const styles = this._getStyle();

    const hasFilters = this.filters.type !== 'all' || this.filters.text;

    const showFilterIndicator = () => {
      if (hasFilters) {
        return <View style={styles.filterIndicator} />;
      }
    };

    return (
      <SectionList
        onScroll={this._handleScroll}
        style={[styles.container]}
        CellRendererComponent={this._renderItemWrapper}
        initialNumToRender={10}
        ref={c => (this.sectionRef = c)}
        onMomentumScrollBegin={this._onMomentumScrollBegin}
        onMomentumScrollEnd={this._onMomentumScrollEnd}
        onScrollBeginDrag={this._onScrollBeginDrag}
        onScrollEndDrag={this._onScrollEndDrag}
        onLayout={(c) => {
          this.setState({ listHeight: c.nativeEvent.layout.height });
        }}
        ListHeaderComponent={(
          <View
            onLayout={(c) => {
              this.setState({ graphHeight: c.nativeEvent.layout.height });
            }}
          >
            <Graph toggleCurrency={toggleCurrency} toggleRange={toggleRange} />
          </View>
)}
        ListFooterComponent={() => {
          const txItemsCount = this.filteredData.length;

          const dailiesCount = Object.keys(this.dailySummary).length;
          const filterHeight = this.state.filterHeight;
          const maxScroll = this.state.listHeight - this.state.headerHeight;

          const itemsHeight = txItemsCount * (56 + 6) + dailiesCount * (36);

          if (itemsHeight >= (maxScroll - filterHeight)) {
            return <View style={{ height: filterHeight }} />;
          }

          const txListHeight = maxScroll - itemsHeight;

          if (txItemsCount) {
            return (
              <Animated.View
                style={{
                  height: txListHeight,
                  transform: [{ translateY: this.state.txItemsOffset }],
                }}
              />
            );
          }

          if (isLoadingTxs || !this.hasFiltered) {
            return (
              <Animated.View
                style={{
                  height: txListHeight,
                  justifyContent: 'flex-start',
                  transform: [{ translateY: this.state.txItemsOffset }],
                }}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator animating size="large" style={{ marginTop: 30 }} />
                  <Text style={{ fontSize: 18, marginTop: 8 }}>Loading transactions</Text>
                  <Text style={{ marginTop: 8 }}>Your wallet will be ready soon</Text>
                </View>
              </Animated.View>
            );
          } if (hasFilters) {
            return (
              <Animated.View
                style={{
                  height: txListHeight,
                  justifyContent: 'flex-start',
                  transform: [{ translateY: this.state.txItemsOffset }],
                }}
              >
                <View
                  style={{
                    marginTop: 40,
                    marginBottom: 18,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>Filter did not match any transactions</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      color: '#8A8A8F',
                      marginTop: 8,
                      ...fontWeight.normal,
                    }}
                  >
                    Try another input
                  </Text>
                </View>
              </Animated.View>
            );
          }

          return (
            <Animated.View
              style={{
                height: txListHeight,
                alignItems: 'center',
                justifyContent: 'flex-start',
                transform: [{ translateY: this.state.txItemsOffset }],
              }}
            >
              <View
                style={{
                  width: 120,
                  height: 120,
                  marginTop: 40,
                  marginBottom: 18,
                }}
              >
                <LottieView
                  style={{}}
                  ref={c => (this.emptyAnim = c)}
                  source={lottieFiles[`emptytrans_${type}`]}
                  autoSize
                />
              </View>
              <Text style={{ fontSize: 18 }}>No transactions</Text>
              <Text
                style={{
                  fontSize: 16,
                  color: '#8A8A8F',
                  marginTop: 8,
                  ...fontWeight.normal,
                }}
              >
                Your transactions will be listed here
              </Text>
            </Animated.View>
          );
        }}
        renderItem={({ item, index }) => {
          if (isLoadingTxs) {
            return null;
          }

          const [tx] = item;

          const txItem = (
            <TransactionListItem
              key="item"
              txData={item}
              confirmations={item[0].confirmations}
              onPressItem={this._onPressItem}
            />
          );

          const doRenderItem = () => {
            if (this.dailySummary[index] !== undefined) {
              const { accFee, date } = this.dailySummary[index];
              const dayItem = (
                <View
                  key="fee"
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    height: 36,
                  }}
                >
                  <Text style={{ fontSize: 14, ...fontWeight.normal }}>{date}</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#8A8A8F',
                      ...fontWeight.normal,
                    }}
                  >
                    {`Paid fees ${numFormat(accFee, ticker)} ${ticker}`}
                  </Text>
                </View>
              );

              return [dayItem, txItem];
            }
            return [txItem];
          };

          return doRenderItem();
        }}
        renderSectionHeader={({ section }) => {
          if (section.title == 'Transactions') {
            return ( // setState below... might want to change that...
              <View
                onLayout={(c) => {
                  this.setState({
                    headerHeight: c.nativeEvent.layout.height - this.state.filterHeight,
                  });
                }}
                style={[styles.listHeader, { paddingBottom: this.state.filterHeight }]}
              >
                <View style={styles.listHeaderTop}>
                  <Text style={styles.subHeader}>Transactions</Text>
                  <Icon
                    iconStyle={styles.subLink}
                    size={24}
                    name="filter-list"
                    onPress={this._toggleFilters}
                    underlayColor={colors.transparent}
                    hitSlop={{
                      top: 20,
                      bottom: 20,
                      left: 20,
                      right: 20,
                    }}
                  />
                  {showFilterIndicator()}
                </View>
                <TransactionFilter
                  txItemsOffset={this.state.txItemsOffset}
                  isOpen={this.state.isFiltersOpen}
                  onFilterChange={this._filtersChanged}
                  onFocus={() => this._scrollToFirstTimeout(1)}
                  changedHeight={height => this.setState({ filterHeight: height })}
                />
              </View>
            );
          }
          return null;
        }}
        keyExtractor={(item, index) => item[0].txid + item[1]}
        stickySectionHeadersEnabled
        sections={this.sections}
      />
    );
  }
}

TransactionList.contextTypes = {
  coinid: PropTypes.object,
  type: PropTypes.string,
  theme: PropTypes.string,
  settingHelper: PropTypes.object,
};

TransactionList.propTypes = {
  transactions: PropTypes.array,
  blockHeight: PropTypes.number,
};

TransactionList.defaultProps = {
  transactions: [],
  blockHeight: 0,
};