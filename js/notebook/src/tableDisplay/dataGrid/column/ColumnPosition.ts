/*
 *  Copyright 2018 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {BeakerxDataGrid} from "../BeakerxDataGrid";
import {ICellData} from "../interface/ICell";
import {
  selectColumnNames, selectColumnOrder, selectColumnsFrozenCount, selectColumnsFrozenNames,
  selectColumnsVisible,
  selectHasIndex
} from "../model/selectors";
import {UPDATE_COLUMN_POSITIONS} from "./reducer";
import {DataGridColumnAction, DataGridColumnsAction} from "../store/DataGridAction";
import {BeakerxDataStore} from "../store/dataStore";
import {selectColumnIndexByPosition} from "./selectors";
import {DEFAULT_HIGHLIGHT_COLOR} from "../style/dataGridStyle";
import {UPDATE_COLUMN_ORDER} from "../model/reducer";
import DataGridColumn from "./DataGridColumn";
import {IColumnPosition} from "../interface/IColumn";
import ColumnManager from "./ColumnManager";
import {COLUMN_TYPES} from "./enums";

export default class ColumnPosition {
  dataGrid: BeakerxDataGrid;
  store: BeakerxDataStore;
  grabbedCellData: ICellData|null;
  dropCellData: ICellData|null;

  constructor(dataGrid: BeakerxDataGrid) {
    this.dataGrid = dataGrid;
    this.store = dataGrid.store;
  }

  stopDragging() {
    this.dataGrid.cellHovered.disconnect(this.handleCellHovered, this);
    this.grabbedCellData = null;
    this.dropCellData = null;
    this.toggleGrabbing(false);
    this.dataGrid.repaint();
  }

  isDragging() {
    return !!this.grabbedCellData;
  }

  reset() {
    const hasIndex = selectHasIndex(this.store.state);

    this.store.dispatch(new DataGridColumnsAction(UPDATE_COLUMN_POSITIONS, {
      hasIndex,
      columnsFrozenNames: selectColumnsFrozenNames(this.store.state),
      columnsVisible: selectColumnsVisible(this.store.state),
      value: selectColumnNames(this.store.state)
    }));

    this.dataGrid.resize();
    this.dataGrid.model.reset();
  }

  getColumnByPosition(position: IColumnPosition) {
    const columnIndex = selectColumnIndexByPosition(this.store.state, position);
    const columnType = position.region === 'row-header' && position.value === 0 ? COLUMN_TYPES.index : COLUMN_TYPES.body;

    return this.dataGrid.columnManager.getColumnByIndex(columnType, columnIndex);
  }

  grabColumn(data: ICellData) {
    this.dataGrid.cellHovered.connect(this.handleCellHovered, this);
    this.grabbedCellData = data;
    this.toggleGrabbing(true);
  }

  dropColumn() {
    if (!this.grabbedCellData || !this.dropCellData) {
      return this.stopDragging();
    }

    this.moveColumn(this.grabbedCellData);
    this.stopDragging();
  }

  setPosition(column: DataGridColumn, position: number) {
    this.store.dispatch(new DataGridColumnAction(
      UPDATE_COLUMN_ORDER,
      {
        value: position,
        columnType: column.type,
        columnName: column.name,
        columnIndex: column.index,
        hasIndex: selectHasIndex(this.store.state)
      })
    );

    this.updateAll();
  }

  updateAll() {
    let order = selectColumnOrder(this.store.state);

    if (!order || !order.length) {
      order = selectColumnNames(this.store.state);
    }

    this.store.dispatch(new DataGridColumnsAction(
      UPDATE_COLUMN_POSITIONS,
      {
        value: order,
        hasIndex: selectHasIndex(this.store.state),
        columnsFrozenNames: selectColumnsFrozenNames(this.store.state),
        columnsVisible: selectColumnsVisible(this.store.state),
      })
    );

    this.dataGrid.resize();
  }

  private moveColumn(data: ICellData) {
    const frozenColumnscount = selectColumnsFrozenCount(this.store.state);
    const column = this.dataGrid.columnManager.getColumnByPosition(ColumnManager.createPositionFromCell(data));
    let destination = this.dropCellData.column;

    if (this.dropCellData.region !== 'corner-header') {
      destination += frozenColumnscount;
    }

    this.setPosition(column, destination);
    this.grabbedCellData = null;
    this.dropCellData = null;
  }

  private toggleGrabbing(enable: boolean) {
    enable
      ? this.dataGrid.node.classList.add('grabbing')
      : this.dataGrid.node.classList.remove('grabbing');
  }

  private handleCellHovered(sender: BeakerxDataGrid, data: ICellData|null) {
    const pressData = this.grabbedCellData;

    if (
      !data
      || !pressData
      || pressData.column === data.column
      || pressData.type !== data.type
    ) {
      return;
    }

    this.dropCellData = data;
    this.dataGrid.repaint();

    // const side = (
    //   !this.dropCellData && data.delta < sectionSize
    //   || this.dropCellData && this.dropCellData.column < pressData.column
    // ) ? 'left': 'right';

    // this.dataGrid.colorizeColumnBorder(data, DEFAULT_HIGHLIGHT_COLOR, side);
  }
}
