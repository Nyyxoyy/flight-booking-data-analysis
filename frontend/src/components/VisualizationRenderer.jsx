import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const DEFAULT_COLORS = [
  '#4361ee', '#3a0ca3', '#4cc9f0', '#4895ef', '#f72585',
  '#7209b7', '#b5179e', '#560bad', '#480ca8', '#3f37c9',
  '#38b000', '#70e000', '#9ef01a', '#ccff33', '#ff9e00',
  '#ff9100', '#ff5400', '#ff0054', '#8338ec', '#3a86ff',
  '#06d6a0', '#118ab2', '#073b4c', '#ef476f', '#ffd166',
  '#8ac926', '#1982c4', '#6a4c93', '#ff595e', '#ffca3a'
];

const detectChartTypeFromQuery = (query) => {
  if (!query) return null;
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('pie chart') || lowerQuery.includes('pie of')) return 'pie';
  if (lowerQuery.includes('bar chart') || lowerQuery.includes('bar graph')) return 'bar';
  if (lowerQuery.includes('line chart') || lowerQuery.includes('line graph') || 
     lowerQuery.includes('trend over time')) return 'line';
  return null;
};

const isDateColumn = (data, colName) => {
  if (!data.length) return false;
  const sampleValue = data[0][colName];
  return (
    (typeof sampleValue === 'string' && sampleValue.match(/\d{4}-\d{2}-\d{2}/)) ||
    sampleValue instanceof Date
  );
};

const detectChartTypeFromData = (data) => {
  if (!data || !data.length) return null;
  
  const columns = Object.keys(data[0]);
  
  // First check if any column is a date (potential x-axis)
  const dateColumn = columns.find(col => isDateColumn(data, col));
  
  // If we have a date column and at least one numeric column
  if (dateColumn) {
    const numericColumns = columns.filter(col => {
      if (col === dateColumn) return false;
      const sampleValue = data[0][col];
      return !isNaN(parseFloat(sampleValue));
    });
    
    if (numericColumns.length > 0) return 'line';
  }
  
  // Fall back to original logic for other cases
  if (columns.length !== 2) return null;

  const numericValues = data.filter(row => {
    const val = row[columns[1]];
    return !isNaN(parseFloat(val));
  }).length;
  
  if (numericValues / data.length > 0.8) return 'bar';
  
  return 'pie';
};

const transformDataForChart = (data, chartType) => {
  if (!data.length) return [];
  
  const columns = Object.keys(data[0]);
  
  if (chartType === 'line') {
    const dateColumn = columns.find(col => isDateColumn(data, col));
    const valueColumn = columns.find(col => col !== dateColumn && !isNaN(parseFloat(data[0][col])));
    
    return data.map(row => ({
      x: new Date(row[dateColumn]).getTime(),
      y: parseFloat(row[valueColumn]) || 0,
      name: new Date(row[dateColumn]).toLocaleDateString()
    }));
  }
  
  // Original logic for other chart types
  const [labelCol, valueCol] = columns;
  return data.map(row => ({
    name: row[labelCol],
    y: parseFloat(row[valueCol]) || 0
  }));
};

const getChartOptions = (chartType, data) => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  const baseOptions = {
    title: { 
      text: 'Query Results Visualization',
      style: { color: isDark ? '#e1e1e1' : '#333333' } 
    },
    chart: {
      backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
    },
    legend: {
      itemStyle: { color: isDark ? '#e1e1e1' : '#333333' }
    },
    xAxis: {
      labels: { style: { color: isDark ? '#e1e1e1' : '#333333' } }
    },
    yAxis: {
      labels: { style: { color: isDark ? '#e1e1e1' : '#333333' } }
    },
    accessibility: { enabled: false },
    credits: { enabled: false },
    colors: DEFAULT_COLORS,
    plotOptions: {
      series: {
        animation: {
          duration: 1000 
        }
      }
    }
  };

  switch (chartType) {
    case 'pie':
      return {
        ...baseOptions,
        chart: { type: 'pie' },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b>: {point.y}',
              color: isDark ? '#e1e1e1' : '#333333'
            }
          }
        },
        series: [{ data }]
      };
    case 'bar':
      return {
        ...baseOptions,
        chart: { type: 'column' },
        xAxis: { type: 'category' },
        plotOptions: {
          column: {
            colorByPoint: true
          }
        },
        series: [{ 
          data,
          showInLegend: false
        }]
      };
    case 'line':
      return {
        ...baseOptions,
        chart: { type: 'line' },
        xAxis: { type: 'datetime' },
        series: [{ data }]
      };
    default:
      return baseOptions;
  }
};

export default function VisualizationRenderer({ response }) {
  const { type, data, query } = response || {};

  if (type === 'string') {
    return (
      <div className="response-string">
        {data}
      </div>
    );
  }

  if (type === 'table') {
    if (!Array.isArray(data)) {
      return <div className="error">Invalid table data format</div>;
    }

    const chartTypeFromQuery = detectChartTypeFromQuery(query);
    const chartType = chartTypeFromQuery || detectChartTypeFromData(data);
    const chartData = chartType ? transformDataForChart(data, chartType) : null;

    return (
      <div>
        {chartType && chartData && (
          <div style={{ marginBottom: '2rem' }}>
            <HighchartsReact
              highcharts={Highcharts}
              options={getChartOptions(chartType, chartData)}
            />
          </div>
        )}

        <div className="response-table">
          <table>
            <thead>
              <tr>
                {data.length > 0 && Object.keys(data[0]).map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} style={{ color: 'var(--text)' }}>{val?.toString() || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <div className="error">Unsupported response type: {type}</div>;
}