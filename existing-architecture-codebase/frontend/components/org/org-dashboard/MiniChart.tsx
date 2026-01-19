import React from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

const MiniChart = () => {
  const options: ApexOptions = {
    chart: {
      type: "area",
      sparkline: { enabled: true },
    },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: ["#22c55e"], // green
    },
    fill: {
      opacity: 0.2,
      colors: ["#22c55e"],
    },
    tooltip: { enabled: false },
  };

  const series = [
    {
      name: "Data",
      data: [20, 30, 25, 40],
    },
  ];

  return (
    <Chart
      options={options}
      series={series}
      type="area"
      height={60}
      width={120}
    />
  );
};

export default MiniChart;
