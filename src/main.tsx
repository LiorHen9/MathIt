import { render } from 'preact';
import { App } from './app/App';
import { installErrorLog } from './app/errorLog';
import { initMotion } from './fx/motion';
import { appUpdates } from './app/updates';
import './styles.css';

installErrorLog();
initMotion();
render(<App />, document.getElementById('app')!);
// New versions (the real build's Service Worker; nothing in the local build).
appUpdates();
