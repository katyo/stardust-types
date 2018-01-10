export type AsyncHook = () => void;

type DeferHandle = any;

const [defer, unfer]: [(fn: () => void) => DeferHandle, (id: DeferHandle) => void] =
    typeof setImmediate == 'function' ? [setImmediate, clearImmediate] :
        [(fn: () => void) => { setTimeout(fn, 0); }, clearTimeout];

export class AsyncCall {
    private $: boolean = false;
    private _: DeferHandle = null;

    wrap(fn: AsyncHook) {
        this.$ = true;
        fn();
        this.$ = false;
    }

    call(fn: AsyncHook) {
        if (this.$) {
            this._ = defer(fn);
        } else {
            fn();
        }
    }

    drop() {
        if (this._) {
            unfer(this._);
            this._ = null;
        }
    }
}
