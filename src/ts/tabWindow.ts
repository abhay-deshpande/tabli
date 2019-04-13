/*
 * Representation of tabbed windows using Immutable.js
 */
import log from 'loglevel';
import * as Immutable from 'immutable';
import { escapeTableCell } from './utils';

export interface SavedTabStateProps {
    bookmarkId: string;
    bookmarkIndex: number;
    title: string;
    url: string;
}
const defaultSavedTabStateProps: SavedTabStateProps = {
    bookmarkId: '',
    bookmarkIndex: 0, // position in bookmark folder
    title: '',
    url: ''
};

/*
 * Tab state that is persisted as a bookmark
 */
export class SavedTabState extends Immutable.Record(
    defaultSavedTabStateProps
) {}

export interface OpenTabStateProps {
    url: string;
    openTabId: number;
    active: boolean;
    openTabIndex: number;
    favIconUrl: string;
    title: string;
    audible: boolean;
    pinned: boolean;
    isSuspended: boolean;
}

const defaultOpenTabStateProps: OpenTabStateProps = {
    url: '',
    openTabId: -1,
    active: false,
    openTabIndex: 0, // index of open tab in its window
    favIconUrl: '',
    title: '',
    audible: false,
    pinned: false,
    isSuspended: false
};

/*
 * Tab state associated with an open browser tab
 */
export class OpenTabState extends Immutable.Record(defaultOpenTabStateProps) {}

interface TabItemProps {
    saved: boolean;
    savedState: SavedTabState | null;
    open: boolean;
    openState: OpenTabState | null;
}

const defaultTabItemProps: TabItemProps = {
    saved: false,
    savedState: null, // SavedTabState iff saved

    open: false, // Note: Saved tabs may be closed even when containing window is open
    openState: null // OpenTabState iff open
};

/*
 * An item in a tabbed window.
 *
 * May be associated with an open tab, a bookmark, or both
 */
export class TabItem extends Immutable.Record(defaultTabItemProps) {
    get title(): string {
        if (this.open && this.openState) {
            return this.openState.title;
        }

        return this.savedState ? this.savedState.title : '';
    }

    get url(): string {
        if (this.open && this.openState) {
            return this.openState.url;
        }

        return this.savedState ? this.savedState.url : '';
    }

    get pinned(): boolean {
        if (this.open && this.openState) {
            return this.openState.pinned;
        }
        return false;
    }

    get active(): boolean {
        if (this.open && this.openState) {
            return this.openState.active;
        }
        return false;
    }

    // safe accessor for savedState:
    get safeSavedState(): SavedTabState {
        if (this.saved && this.savedState) {
            return this.savedState;
        }
        throw new Error('Unexpected access of savedState on unsaved tab');
    }

    // safe accessor for openState:
    get safeOpenState(): OpenTabState {
        if (this.open && this.openState) {
            return this.openState;
        }
        throw new Error('Unexpected access of openState on non-open tab');
    }
}

/*
 * A TabWindow
 *
 * Tab windows have a title and a set of tab items.
 *
 * A TabWindow has 4 possible states:
 *   (open,!saved)   - An open Chrome window that has not had its tabs saved
 *   (open,saved)    - An open Chrome window that has also had its tabs saved (as bookmarks)
 *   (!open,saved,!snapshot)   - A previously saved window that is not currently
 *                           open and has no snapshot. tabItems will consist solely
 *                           of saved tabs (persisted as boookmarks).
 *
 *   (!open,saved,snapshot) - A previously saved window that is not currently open but
 *                            where tabItems contains the tab state the last time the
 *                            window was open
 */
interface TabWindowProps {
    saved: boolean;
    savedTitle: string;
    savedFolderId: string;

    open: boolean;
    openWindowId: number;
    windowType: string;
    width: number;
    height: number;
    tabItems: Immutable.List<TabItem>;
    snapshot: boolean;
    chromeSessionId: string | null;
    expanded: boolean | null;
}

const defaultTabWindowProps: TabWindowProps = {
    saved: false,
    savedTitle: '',
    savedFolderId: '',

    open: false,
    openWindowId: -1,
    windowType: '',
    width: 0,
    height: 0,

    tabItems: Immutable.List(), // <TabItem>

    snapshot: false, // Set if tabItems contains snapshot of last open state
    chromeSessionId: null, // Chrome session id for restore (if found)

    // This is view state, so technically doesn't belong here, but we only have
    // one window component per window right now, we want to be able to toggle
    // this state via a keyboard handler much higher in the hierarchy,
    // and cost to factor out view state would be high.
    expanded: null // tri-state: null, true or false
};

export class TabWindow extends Immutable.Record(defaultTabWindowProps) {
    private _title: string | undefined;
    private _id: string | undefined;

    get title(): string {
        if (this._title === undefined) {
            this._title = this.computeTitle();
        }

        return this._title;
    }

    computeTitle(): string {
        if (this.saved) {
            return this.savedTitle;
        }

        const activeTab = this.tabItems.find(
            t => t.open && t.openState!.active
        );

        if (!activeTab) {
            // shouldn't happen!
            log.warn(
                'TabWindow.get title(): No active tab found: ',
                this.toJS()
            );

            var openTabItem = this.tabItems.find(t => t.open);
            if (!openTabItem) {
                return '';
            }
            return openTabItem.title;
        }

        return activeTab.title;
    }

    updateSavedTitle(title: string): TabWindow {
        delete this._title;
        return this.set('savedTitle', title);
    }

    // get a unique id for this window
    // useful as key in React arrays
    get id(): string {
        if (this._id === undefined) {
            if (this.saved) {
                this._id = '_saved' + this.savedFolderId;
            } else {
                this._id = '_open' + this.openWindowId;
            }
        }
        return this._id;
    }

    get openTabCount(): number {
        return this.tabItems.count(ti => ti.open);
    }

    /*
     * Returns [index,TabItem] pair if window contains chrome tab id or else null
     */
    findChromeTabId(tabId: number): [number, TabItem] | null {
        const ret = this.tabItems.findEntry(
            ti =>
                !!ti.open &&
                ti.openState !== null &&
                ti.openState.openTabId === tabId
        );
        return ret ? ret : null;
    }
    /*
     * Returns [index,TabItem] pair if window contains chrome bookmark id or else null
     */
    findChromeBookmarkId(bookmarkId: string): [number, TabItem] | null {
        const ret = this.tabItems.findEntry(
            ti =>
                !!ti.saved &&
                ti.savedState !== null &&
                ti.savedState.bookmarkId === bookmarkId
        );
        return ret ? ret : null;
    }

    getActiveTabId(): number | null {
        const activeTab = this.tabItems.find(
            t => t.open && t.openState!.active
        );
        const tabId = activeTab ? activeTab.openState!.openTabId : null;
        return tabId;
    }

    /*
     * set tabItems.
     * Used to sort, but openTabIndex from Chrome isn't maintained by tab updates
     * so we reverted that.
     * Then we briefly used .cacheResult() when tabItems was (supposedly) a Seq,
     * but it turned out that certain code paths (such as inserting a tab) would
     * result in nextItems being a List.
     * Seems to make the most sentence to just make tabItems a List not a Seq
     */
    setTabItems(nextItems: Immutable.List<TabItem>): TabWindow {
        /* HACK: debugging only check; get rid of this! */
        if (!nextItems) {
            log.error('setTabItems: bad nextItems: ', nextItems);
        }
        return this.set('tabItems', nextItems);
    }

    /*
     * get index of an item in this TabWindow
     */
    indexOf(target: TabItem): number | null {
        return this.tabItems.indexOf(target);
    }

    exportStr(): string {
        const fmtTabItem = (ti: TabItem) => {
            const urls = ti.url != null ? ti.url : '';
            const ret = escapeTableCell(ti.title) + ' | ' + urls + '\n';
            return ret;
        };
        const titleStr = '### ' + this.title;
        const headerStr = `
Title                                  | URL
---------------------------------------|-----------
`;
        const s0 = titleStr + '\n' + headerStr;
        const s = this.tabItems.reduce((rs, ti) => rs + fmtTabItem(ti), s0);
        return s;
    }

    // combine local expanded state with global expanded state to determine if expanded:
    isExpanded(winStore: any): boolean {
        if (this.expanded === null) {
            return winStore.expandAll && this.open;
        }
        return this.expanded;
    }
}
