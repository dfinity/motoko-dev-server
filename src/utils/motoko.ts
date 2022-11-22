import motoko from 'motoko';
import { sep } from 'path';

export function getVirtualFile(file: string) {
    return motoko.file(file.replace(sep, '/')); // TODO: test on Windows
}
