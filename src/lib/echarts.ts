import * as echarts from "echarts/core";
import { ScatterChart, BarChart, LineChart } from "echarts/charts";
import {
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  ToolboxComponent,
  BrushComponent,
  GraphicComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  ScatterChart,
  BarChart,
  LineChart,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  ToolboxComponent,
  BrushComponent,
  GraphicComponent,
  CanvasRenderer,
]);

export default echarts;
