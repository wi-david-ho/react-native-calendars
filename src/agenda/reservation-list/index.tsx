import PropTypes from 'prop-types';
import XDate from 'xdate';

import React, {Component} from 'react';
import {View, FlatList, StyleProp, ViewStyle, TextStyle, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent} from 'react-native';

import {extractComponentProps} from '../../componentUpdater';
import {sameDate} from '../../dateutils';
import {parseDate, toMarkingFormat} from '../../interface';
import styleConstructor from './style';
import Reservation, {ReservationProps} from './reservation';
import {AgendaEntry, AgendaSchedule} from '../../types';


export type ReservationListProps = ReservationProps & {
  /** the list of items that have to be displayed in agenda. If you want to render item as empty date
  the value of date key kas to be an empty array []. If there exists no value for date key it is
  considered that the date in question is not yet loaded */
  items?: AgendaSchedule;
  selectedDay?: XDate;
  topDay?: XDate;
  /** Show items only for the selected date. Default = false */
  showOnlySelectedDayItems?: boolean;
  /** callback that gets called when day changes while scrolling agenda list */
  onDayChange?: (day: XDate) => void;
  /** specify what should be rendered instead of ActivityIndicator */
  renderEmptyData?: () => JSX.Element;
  style?: StyleProp<ViewStyle>;

  /** onScroll FlatList event */
  onScroll?: (yOffset: number) => void;
  /** Called when the user begins dragging the agenda list **/
  onScrollBeginDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Called when the user stops dragging the agenda list **/
  onScrollEndDrag?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Called when the momentum scroll starts for the agenda list **/
  onMomentumScrollBegin?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Called when the momentum scroll stops for the agenda list **/
  onMomentumScrollEnd?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** A RefreshControl component, used to provide pull-to-refresh functionality for the ScrollView */
  refreshControl?: JSX.Element;
  /** Set this true while waiting for new data from a refresh */
  refreshing?: boolean;
  /** If provided, a standard RefreshControl will be added for "Pull to Refresh" functionality. Make sure to also set the refreshing prop correctly */
  onRefresh?: () => void;
  /** Extractor for underlying FlatList. Ensure that this is unique per item, or else scrolling may have duplicated and / or missing items.  */
  reservationsKeyExtractor?: (item: DayAgenda, index: number) => string;
  /** Set an initial number of row to render in reservation list */
  initialNumToRender?: number;
};

interface DayAgenda {
  reservation?: AgendaEntry;
  date?: XDate;
}

interface State {
  reservations: DayAgenda[];
}

class ReservationList extends Component<ReservationListProps, State> {
  static displayName = 'ReservationList';

  static propTypes = {
    ...Reservation.propTypes,
    items: PropTypes.object,
    selectedDay: PropTypes.instanceOf(XDate),
    topDay: PropTypes.instanceOf(XDate),
    onDayChange: PropTypes.func,
    
    showOnlySelectedDayItems: PropTypes.bool,
    renderEmptyData: PropTypes.func,

    onScroll: PropTypes.func,
    onScrollBeginDrag: PropTypes.func,
    onScrollEndDrag: PropTypes.func,
    onMomentumScrollBegin: PropTypes.func,
    onMomentumScrollEnd: PropTypes.func,
    refreshControl: PropTypes.element,
    refreshing: PropTypes.bool,
    onRefresh: PropTypes.func,
    reservationsKeyExtractor: PropTypes.func,
    /** Set an initial number of row to render in reservation list */
    initialNumToRender: PropTypes.number,
  };
  
  static defaultProps = {
    refreshing: false,
    selectedDay: new XDate(true)
  };

  private style: {[key: string]: ViewStyle | TextStyle};
  private heights: number[];
  private selectedDay?: XDate;
  private scrollOver: boolean;
  private renderCount: number;
  private list: React.RefObject<FlatList> = React.createRef();


  constructor(props: ReservationListProps) {
    super(props);

    this.style = styleConstructor(props.theme);

    this.state = {
      reservations: []
    };

    this.heights = [];
    this.selectedDay = props.selectedDay;
    this.scrollOver = true;
    this.renderCount = 0;
  }

  componentDidMount() {
    this.updateDataSource(this.getReservations(this.props).reservations);
  }

  componentDidUpdate(prevProps: ReservationListProps) {
    if (this.props.topDay && prevProps.topDay && prevProps !== this.props) {
      if (!sameDate(prevProps.topDay, this.props.topDay)) {
        this.setState({reservations: []},
          () => this.updateReservations(this.props)
        );
      } else {
        this.updateReservations(this.props);
      }
    }
  }

  updateDataSource(reservations: DayAgenda[]) {
    this.setState({reservations});
  }

  updateReservations(props: ReservationListProps) {
    const {selectedDay} = props;
    const reservations = this.getReservations(props);
    const selectDayString = selectedDay?.toString("yyyy-MM-dd");
    const todayString = new XDate().toString("yyyy-MM-dd");
    const firstDayOfSelectDate = new XDate(new XDate(selectDayString || "").getFullYear(), new XDate(selectDayString || "").getMonth(), 1);
    if ((this.renderCount < 1 && !sameDate(selectedDay, this.selectedDay))) {
      this.selectedDay = selectedDay;
      if (this.list) {
        setTimeout(() => {
          let scrollPosition = 0;
          for (let i = 0; i < reservations.scrollPosition; i++) {
            scrollPosition += this.heights[i] || 0;
          }
          this.scrollOver = false;
          this.list?.current?.scrollToOffset({offset: scrollPosition, animated: false});
        }, this.heights.length == 0 ? 1000 : 0);
      }
      this.renderCount = 1;
    } else {
      if (this.list && (!sameDate(selectedDay, this.selectedDay) || sameDate(selectedDay, firstDayOfSelectDate) || selectDayString === todayString)) {
        let scrollPosition = 0;
        for (let i = 0; i < reservations.scrollPosition; i++) {
          scrollPosition += this.heights[i] || 0;
        }
        this.scrollOver = false;
        this.list?.current?.scrollToOffset({offset: scrollPosition, animated: true});
      }
      this.selectedDay = selectedDay;
    }
    this.updateDataSource(reservations.reservations);
  }

  getReservationsForDay(iterator: XDate, props: ReservationListProps) {
    const day = iterator.clone();
    const res = props.items?.[toMarkingFormat(day)];
    
    if (res && res.length) {
      return res.map((reservation: AgendaEntry, i: number) => {
        return {
          reservation,
          date: i ? undefined : day
        };
      });
    } else if (res) {
      return [
        {
          date: iterator.clone()
        }
      ];
    } else {
      return false;
    }
  }

  getReservations(props: ReservationListProps) {
    const {selectedDay, showOnlySelectedDayItems} = props;
    
    if (!props.items || !selectedDay) {
      return {reservations: [], scrollPosition: 0};
    }

    let reservations: DayAgenda[] = [];
    const isIterator = true;
    if (isIterator) {
      const iterator = parseDate(Object.keys(props.items)[0] + 'T00:00:00.000Z');
      if (iterator) {
        while (iterator.getTime() < selectedDay.getTime()) {
          const res = this.getReservationsForDay(iterator, props);
          reservations = reservations.concat(res || []);
          iterator.addDays(1);
        }
      }
    }

    const scrollPosition = reservations.length;
    const iterator = selectedDay.clone();
    if (showOnlySelectedDayItems) {
      const res = this.getReservationsForDay(iterator, props);

      if (res) {
        reservations = res;
      }
      iterator.addDays(1);
    } else {
      for (let i = 0; i < Object.keys(props.items).length; i++) {
        const res = this.getReservationsForDay(iterator, props);

        if (res) {
          reservations = reservations.concat(res);
        }
        iterator.addDays(1);
      }
    }

    return {reservations, scrollPosition};
  }

  onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    this.props.onScroll?.(yOffset);

    let topRowOffset = 0;
    let topRow;
    for (topRow = 0; topRow < this.heights.length; topRow++) {
      if (topRowOffset + this.heights[topRow] / 2 >= yOffset) {
        break;
      }
      topRowOffset += this.heights[topRow];
    }

    const row = this.state.reservations[topRow];
    if (!row) return;

    const day = row.date;
    if (day) {
      if (!sameDate(day, this.selectedDay) && this.scrollOver) {
        this.selectedDay = day.clone();
        this.props.onDayChange?.(day.clone());
      }
    }
  };

  onListTouch() {
    this.scrollOver = true;
  }

  onRowLayoutChange(index: number, event: LayoutChangeEvent) {
    this.heights[index] = event.nativeEvent.layout.height;
  }

  onMoveShouldSetResponderCapture = () => {
    this.onListTouch();
    return false;
  };

  renderRow = ({item, index}: {item: DayAgenda; index: number}) => {
    const reservationProps = extractComponentProps(Reservation, this.props);

    return (
      <View onLayout={this.onRowLayoutChange.bind(this, index)}>
        <Reservation {...reservationProps} item={item.reservation} date={item.date}/>
      </View>
    );
  };

  keyExtractor = (item: DayAgenda, index: number) => {
    return this.props.reservationsKeyExtractor?.(item, index) || `${item?.reservation?.day}${index}`;
  }

  render() {
    const {style} = this.props;
    return (
      <FlatList
        ref={this.list}
        style={style}
        initialNumToRender={this.props.initialNumToRender}
        contentContainerStyle={this.style.content}
        data={this.state.reservations}
        renderItem={this.renderRow}
        keyExtractor={this.keyExtractor}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={200}
        onMoveShouldSetResponderCapture={this.onMoveShouldSetResponderCapture}
        onScroll={this.onScroll}
        refreshControl={this.props.refreshControl}
        refreshing={this.props.refreshing}
        onRefresh={this.props.onRefresh}
        onScrollBeginDrag={this.props.onScrollBeginDrag}
        onScrollEndDrag={this.props.onScrollEndDrag}
        onMomentumScrollBegin={this.props.onMomentumScrollBegin}
        onMomentumScrollEnd={this.props.onMomentumScrollEnd}
      />
    );
  }
}

export default ReservationList;
