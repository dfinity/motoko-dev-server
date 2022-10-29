import { useState } from 'react';
import reactLogo from './assets/react.svg';
import './App.css';
import { getCanister } from './ic';

const counter = getCanister('counter');

const initialCount = await counter.call('get');

function App() {
    const [count, setCount] = useState(initialCount);

    const increment = async () => {
        await counter.call('inc');
        setCount(await counter.call('get'));
    };

    return (
        <div className="App">
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img src="/vite.svg" className="logo" alt="Vite logo" />
                </a>
                <a href="https://reactjs.org" target="_blank">
                    <img
                        src={reactLogo}
                        className="logo react"
                        alt="React logo"
                    />
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <button onClick={() => increment()}>count is {count}</button>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
        </div>
    );
}

export default App;
