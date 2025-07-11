import { basic, initSidebar, initTopbar } from './modules/layouts';
import {
  loadImg,
  imgPopup,
  initClipboard,
  initToc,
  loadMermaid
} from './modules/components';

loadImg();
imgPopup();
initSidebar();
initTopbar();
initClipboard();
initToc();
loadMermaid();
basic();
