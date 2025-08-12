
declare const Chart: any;

export async function loadView(view: string) {
	try {
		const res = await fetch(view);
		const html = await res.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		return doc.body.firstElementChild;
	} catch (e) {
		console.error("Failed to fetch html:", e);
	}
}

export function setChartDefaults() {
	Chart.defaults.font = {
	    size: 12,
	    family: "Arial",
	    weight: "bold"
	};
	Chart.defaults.color = "#636363";
	Chart.defaults.plugins.legend.display = false;
	Chart.defaults.plugins.tooltip.enabled = false;
	Chart.defaults.plugins.tooltip.enabled = false;
	Chart.defaults.set('responsive', true);
}

export const centerTextPlugin = {
	id: "centerText",
	beforeDraw(chart: any) {
		const { ctx, chartArea } = chart;
		const { left, right, top, bottom, width, height } = chartArea;
		ctx.save();
	
		const text = chart.options.centerText || '';
		ctx.font = "bold 24px sans-serif";
		ctx.fillStyle = "#8DC5FF";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
  
		const centerX = left + width / 2;
		const centerY = top + height / 2;
		ctx.fillText(text, centerX, centerY);
		ctx.restore();
	}
};