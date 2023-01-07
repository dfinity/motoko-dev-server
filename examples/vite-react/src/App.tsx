import { useEffect, useState } from 'react';
import './App.css';
import motokoLogo from './assets/motoko_moving.png';
import motokoShadowLogo from './assets/motoko_shadow.png';
import reactLogo from './assets/react.svg';
import { backend } from './declarations/backend';

function App() {
    const [count, setCount] = useState<number | undefined>();
    const [loading, setLoading] = useState(false);

    // Get the current counter value
    const fetchCount = async () => {
        try {
            const count = await backend.get();
            setCount(+count.toString());
        } catch (err) {
            console.error(err);
        }
    };

    const increment = async () => {
        if (loading) return; // Cancel if waiting for a new count
        try {
            setLoading(true);
            await backend.inc(); // Increment the count by 1
            if (count !== undefined) {
                setCount(count + 1); // Optimistic rendering
            }
            await fetchCount(); // Fetch the new count
        } finally {
            setLoading(false);
        }
    };

    // Fetch the count on page load
    useEffect(() => {
        fetchCount();
    }, []);

    return (
        <div className="App">
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img
                        src="/vite.svg"
                        className="logo vite"
                        alt="Vite logo"
                    />
                </a>
                <a href="https://reactjs.org" target="_blank">
                    <img
                        src={reactLogo}
                        className="logo react"
                        alt="React logo"
                    />
                </a>
                <div className="logo-stack">
                    <a href="https://smartcontracts.org" target="_blank">
                        <img
                            src={motokoShadowLogo}
                            className="logo motoko-shadow"
                            alt="Motoko logo"
                        />
                    </a>
                    <a href="https://smartcontracts.org" target="_blank">
                        <img
                            src={motokoLogo}
                            className="logo motoko"
                            alt="Motoko logo"
                        />
                    </a>
                </div>
            </div>
            <h1>Vite + React + Motoko</h1>
            <div className="card">
                <button onClick={increment}>
                    count is {loading ? '...' : count}
                </button>
                <p>
                    Edit <code>backend/Main.mo</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite, React, and Motoko logos to learn more
            </p>
        </div>
    );
}

export default App;
