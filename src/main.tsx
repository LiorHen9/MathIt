import { render } from 'preact';
import { App } from './app/App';
import { installErrorLog } from './app/errorLog';
import { initMotion } from './fx/motion';
import './styles.css';

installErrorLog();
initMotion();
render(<App />, document.getElementById('app')!);
