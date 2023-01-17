import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface Config {
    directory: string;
}

export class FileCache {
    private readonly _config: Config;
    private readonly _map = new Map<string, string>();

    constructor(config: Config) {
        this._config = config;
    }

    _resolvePath(path: string) {
        return resolve(this._config.directory, path);
    }

    /**
     * Find the file content for a given path.
     * @param path File system path
     */
    get(path: string): string | undefined {
        path = this._resolvePath(path);
        if (!existsSync(path)) {
            return;
        }
        const cached = this._map.get(path);
        if (cached) {
            return cached;
        }
        const source = readFileSync(path, 'utf8');
        this._map.set(path, source);
        return source;
    }

    /**
     * Update the source code for a given path. Returns `true` if changed, otherwise `false`.
     * @param path File system path
     */
    update(path: string): boolean {
        path = this._resolvePath(path);
        const previous = this._map.get(path);
        const current = this.get(path);
        return current !== previous;
    }

    /**
     * Reset the cache for the given path. Returns `true` if changed, otherwise `false`.
     * @returns File system path
     */
    invalidate(path: string): boolean {
        path = this._resolvePath(path);
        return this._map.delete(path);
    }
}
