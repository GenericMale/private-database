import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {DetailResult, Entry, Plugin, SearchParameters, SearchResult} from '../../../server/types';
import {PluginService} from '../services/plugin.service';
import {Observable, Subscriber} from 'rxjs';
import {NgForm} from '@angular/forms';
import {TranslateService} from '@ngx-translate/core';
import {MessageService} from 'primeng/api';

@Component({
    selector: 'pdb-search-dialog',
    templateUrl: './search-dialog.component.html'
})
export class SearchDialogComponent implements OnInit {

    @ViewChild(NgForm)
    form: NgForm;

    visible = false;

    plugins: Plugin[];
    selectedPlugin: Plugin;

    searchParams: SearchParameters = {};
    selectedEntry: Entry;
    skipSearch: boolean;

    columns: { field: string, header: string }[];
    selection: SearchResult | SearchResult[];

    results: SearchResult[] = null;

    subscriber: Subscriber<{result: string[], skip: boolean}>;

    constructor(private translateService: TranslateService,
                private pluginService: PluginService,
                private messageService: MessageService) {
    }

    public show(entry?: Entry, skipSearch?: boolean) {
        return new Observable<{result: string[], skip: boolean}>(subscriber => {
            this.form.form.markAsPristine();
            this.subscriber = subscriber;
            this.selectedEntry = entry;
            this.skipSearch = skipSearch;
            this.results = null;
            this.updateSearchParams();
            this.visible = true;

            if (this.skipSearch) {
                this.searchClick();
            }
        });
    }

    ngOnInit(): void {
        this.pluginService.getPlugins().subscribe(plugins => {
            this.plugins = plugins;
            this.selectedPlugin = plugins[0];
            this.updateSearchParams();
        });
    }

    visibleChange(visible) {
        if (this.visible === visible) {
            return;
        }

        this.visible = visible;
        if (!visible) {
            this.subscriber.error();
            this.subscriber.complete();
        }
    }

    pluginChange() {
        this.updateSearchParams();
    }

    searchClick() {
        this.pluginService.search(this.selectedPlugin.name, this.searchParams).subscribe(results => {
            if (results && results.length) {
                this.columns = Object.keys(results[0]).filter(field => field !== 'urls' && field !== 'files').map(field => ({
                    field,
                    header: this.translateService.instant(field)
                }));
            } else {
                return this.messageService.add({
                    severity: 'error',
                    summary: this.translateService.instant('ErrorDialogSummary'),
                    detail: this.translateService.instant('NoResultsDialogDetail'), life: 5000});
            }

            this.selection = this.selectedEntry && results && results.length > 0 ? results[0] : null;
            if (this.selection && this.selectedPlugin.skipResults === true) {
                this.saveClick();
            } else {
                this.results = results;
            }
        });
    }

    private updateSearchParams() {
        this.searchParams = {};
        if (this.selectedPlugin) {
            this.selectedPlugin.searchParameters.forEach(s =>
                this.searchParams[s.name] = this.selectedEntry && this.selectedEntry[s.name] ? this.selectedEntry[s.name] : s.default
            );
        }
    }

    saveClick() {
        this.pluginService.saveDetails(
            this.selectedPlugin.name,
            [].concat(this.selection),
            this.selectedEntry ? this.selectedEntry.$entry : null
        ).subscribe(details => {
            this.visible = false;
            this.subscriber.next({result: details, skip: this.skipSearch});
            this.subscriber.complete();
        });
    }

    skipClick() {
        this.visible = false;
        this.subscriber.next({result: [], skip: this.skipSearch});
        this.subscriber.complete();
    }

    backClick() {
        this.results = null;
    }

    externalClick(data: DetailResult) {
        window.open(data.urls[0]);
    }

    @HostListener('document:keydown.enter')
    keydownEnter() {
        if (!this.visible) {
            return;
        }

        if (this.results === null && this.form.form.valid) {
            this.searchClick();
        }

        if (this.results !== null && this.selection) {
            this.saveClick();
        }
    }

}
