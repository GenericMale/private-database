import {AfterViewInit, Component, OnInit, Pipe, PipeTransform, ViewChild} from '@angular/core';
import {Table} from 'primeng/table';

import {PrimeNGConfig} from 'primeng/api';

import {Entry} from '../../server/types';
import {DatabaseService} from './services/database.service';
import {TranslateService} from '@ngx-translate/core';
import {from} from 'rxjs';
import {concatMap, tap, toArray} from 'rxjs/operators';
import {SearchDialogComponent} from './components/search-dialog.component';
import {VideoDialogComponent} from './components/video-dialog.component';
import {DomSanitizer} from '@angular/platform-browser';
import {Menu} from 'primeng/menu';
import {OverlayPanel} from 'primeng/overlaypanel';

@Pipe({
    name: 'safeHtml'
})
export class SafeHtmlPipe implements PipeTransform {

    constructor(protected sanitizer: DomSanitizer) {
    }

    public transform(value: string): any {
        return this.sanitizer.bypassSecurityTrustHtml(value);
    }
}

const LOCALSTORAGE_FIELDS = 'fields';

@Component({
    selector: 'pdb-root',
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, AfterViewInit {

    @ViewChild(SearchDialogComponent)
    searchDialog: SearchDialogComponent;

    @ViewChild(VideoDialogComponent)
    videoDialog: VideoDialogComponent;

    @ViewChild('columnsPanel')
    columnsPanel: OverlayPanel;

    @ViewChild('dt')
    table: Table;

    allFields: string[];
    fields: string[];
    selectedFields: string[];

    showFilterRow = false;

    data: Entry[];
    selection: Entry[] = [];

    showDetails = true;
    detailPage: string;
    detailEntry: string;

    detailsTemplate = 'movies';

    constructor(private databaseService: DatabaseService,
                private translateService: TranslateService,
                private primengConfig: PrimeNGConfig) {
    }

    ngOnInit() {
        this.primengConfig.ripple = true;
        this.loadData();
    }

    loadData() {
        this.fields = JSON.parse(localStorage.getItem(LOCALSTORAGE_FIELDS));

        this.databaseService.list(['urls', 'files'].concat(this.fields)).subscribe(data => {
            this.data = data;

            if (this.selection.length > 0) {
                this.selection = this.data.filter(d => this.selection.some(s => s.$entry === d.$entry));
                // TODO: this.table.scrollToVirtualIndex(this.data.indexOf(this.selection[0]));
            }

            if (this.showDetails && this.selection.length > 0) {
                let selection = this.selection[this.selection.length - 1];
                this.databaseService.getPage(selection.$entry, this.detailsTemplate)
                    .subscribe((detailPage) => this.detailPage = detailPage);
            }
        });
    }

    createClick() {
        this.searchDialog.show().subscribe(({result}) => {
            this.selection = result.map($entry => ({$entry}));
            this.loadData();
        });
    }

    extendClick() {
        let skip = this.selection.length > 1 ? false : undefined;
        from(this.selection).pipe(concatMap(selected =>
            this.searchDialog.show(selected, skip).pipe(tap((data) => skip = data.skip ))
        ), toArray()).subscribe(() => {
            this.loadData();
        });
    }

    deleteClick() {
        this.databaseService.remove(this.selection).subscribe(() => {
            this.selection = [];
            this.loadData();
        });
    }

    stateRestore(dt: Table) {
        this.showFilterRow = this.fields.some(field => dt.filters[field] && dt.filters[field].value);
    }

    getURLModel() {
        if (this.selection.length === 0 || !Array.isArray(this.selection[0].urls)) {
            return [];
        }

        return this.selection[0].urls.map((url, i) => ({
            label: new URL(url).hostname.replace(/^www./i, ''),
            command: () => this.openExternal(i)
        }));
    }

    openURLButtonClick(menu: Menu, $event) {
        if ((this.selection[0].urls as string[]).length > 1) {
            menu.toggle($event);
        } else {
            this.openExternal();
        }
    }

    openExternal(index = 0) {
        if (this.selection[0] && this.selection[0].urls && this.selection[0].urls[index]) {
            window.open(this.selection[0].urls[index]);
        }
    }

    openVideo(index = 0) {
        if (this.selection[0] && Array.isArray(this.selection[0].files)) {
            this.videoDialog.show(this.selection[0].files, this.selection[0].$entry, index);
        }
    }

    rowDoubleClick(rowData: Entry) {
        if (Array.isArray(rowData.files)) {
            this.videoDialog.show(rowData.files, rowData.$entry, 0);
        } else if (rowData.urls && rowData.urls[0]) {
            window.open(rowData.urls[0]);
        }
    }

    detailsClick() {
        if (this.showDetails) {
            this.showDetails = false;
        } else {
            this.showDetails = true;

            let selection = this.selection[this.selection.length - 1];
            if (this.detailEntry !== selection.$entry) {
                this.databaseService.getPage(selection.$entry, this.detailsTemplate).subscribe((detailPage) => {
                    this.detailPage = detailPage;
                    this.detailEntry = selection.$entry;
                });
            }
        }
    }

    columnsButtonClick(event) {
        this.selectedFields = this.fields;

        if (this.columnsPanel.overlayVisible) {
            this.columnsPanel.hide();
        } else if (this.allFields && this.allFields.length > 0) {
            this.columnsPanel.show(event);
        } else {
            this.databaseService.getFields().subscribe(fields => {
                this.allFields = fields;
                if (this.allFields.length > 0) {
                    this.columnsPanel.show(event);
                }
            });
        }
    }

    columnsPanelHide() {
        if (this.fields !== this.selectedFields) {
            this.fields = this.selectedFields;
            localStorage.setItem('fields', JSON.stringify(this.fields));
            this.loadData();
        }
    }

    selectionChange(selection) {
        this.selection = selection;

        let lastSelected = selection[selection.length - 1];
        if (this.showDetails && this.detailEntry !== lastSelected.$entry) {
            this.databaseService.getPage(lastSelected.$entry, this.detailsTemplate).subscribe((detailPage) => {
                this.detailPage = detailPage;
                this.detailEntry = lastSelected.$entry;
            });
        }
    }

    /**
     * Workaround to make column resize work on table with virtual scroll enabled.
     * see https://github.com/primefaces/primeng/issues/8885
     */
    ngAfterViewInit(): void {
        const viewportScrollable = document.getElementsByTagName('cdk-virtual-scroll-viewport');
        viewportScrollable[0].classList.add('p-datatable-scrollable-body');
    }
}
