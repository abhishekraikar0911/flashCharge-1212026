import { dom } from "../core/dom.js";

export function updateDashboard({ volt, curr, soc, energy }) {
  if (dom.volt) dom.volt.innerText = volt.toFixed(1);
  if (dom.curr) dom.curr.innerText = curr.toFixed(1);
  if (dom.soc)  dom.soc.innerText  = soc.toFixed(2);
  if (dom.kwh)  dom.kwh.innerText  = energy.toFixed(3);

  if (dom.socPath) dom.socPath.style.strokeDasharray = `${soc},100`;
}

