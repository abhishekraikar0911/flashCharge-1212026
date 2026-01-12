let chart;

export function initChart() {
  const el = document.getElementById("liveChart");
  if (!el) return;

  const ctx = el.getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array(40).fill(""),
      datasets: [{ data: Array(40).fill(0) }]
    },
    options: { animation: false }
  });
}

export function updateChart(val) {
  if (!chart) return;
  chart.data.datasets[0].data.shift();
  chart.data.datasets[0].data.push(val);
  chart.update();
}

