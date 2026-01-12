export const dom = {};

export function initDom() {
  dom.volt = document.getElementById('disp-volt');
  dom.curr = document.getElementById('disp-curr');
  dom.pwr  = document.getElementById('disp-pwr');
  dom.soc  = document.getElementById('disp-soc');
  dom.kwh  = document.getElementById('disp-kwh');
  dom.status = document.getElementById('sys-status');
  dom.socPath = document.getElementById('soc-path');

  dom.btnStart = document.getElementById('btn-start');
  dom.btnStop  = document.getElementById('btn-stop');
}

