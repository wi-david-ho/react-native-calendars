import React from 'react';
import {FlatList} from 'react-native';
import {fireEvent, render, screen, within} from '@testing-library/react-native';
import {getDefaultLocale} from '../services';

export class CalendarListDriver {
  testID: string;
  element: React.ReactElement;

  constructor(testID: string, element: React.ReactElement) {
    this.testID = testID;
    this.element = element;
    this.render(element);
  }

  render(element = this.element): ReturnType<typeof render> {
    if (!element) throw 'Element is missing';
    return render(element);
  }

  /** List */

  getList() {
    return screen.UNSAFE_getAllByType(FlatList);
  }

  getItemTestID(date: string) {
    const [year, month] = date.split('-');
    return `${this.testID}.item_${year}-${month}`;
  }

  getListItem(date: string) {
    console.log('item: ', screen.getByTestId(this.getItemTestID(date)));
    return screen.getByTestId(this.getItemTestID(date));
  }

  getListItemTitle(date: string) {
    const year = new Date(date).getFullYear();
    const monthName = getDefaultLocale().monthNames[new Date(date).getMonth()];
    return within(this.getListItem(date)).getByText(`${monthName} ${year}`);
  }

  /** Static header */

  get staticHeaderTestID() {
    return `${this.testID}.staticHeader`;
  }

  getStaticHeader() {
    return screen.getByTestId(this.staticHeaderTestID);
  }

  getStaticHeaderTitle() {
    return screen.getByTestId(`${this.staticHeaderTestID}.title`).children[0];
  }

  getStaticHeaderLeftArrow() {
    return screen.getByTestId(`${this.staticHeaderTestID}.leftArrow`);
  }

  getStaticHeaderRightArrow() {
    return screen.getByTestId(`${this.staticHeaderTestID}.rightArrow`);
  }

  pressLeftArrow() {
    fireEvent(this.getStaticHeaderLeftArrow(), 'onPress');
  }

  pressRightArrow() {
    fireEvent(this.getStaticHeaderRightArrow(), 'onPress');
  }

  /** Day press */

  getDayTestID(date: string) {
    const [year, month] = date.split('-');
    return `${this.testID}.item_${year}-${month}.day_${date}`;
  }

  getDay(date: string) {
    return screen.getByTestId(this.getDayTestID(date));
  }

  selectDay(date: string) {
    fireEvent(this.getDay(date), 'onPress');
  }
}
