import {Component} from '@angular/core';
import {DetailResult, Entry} from '../../../server/types';

@Component({
    selector: 'pdb-video-dialog',
    templateUrl: './video-dialog.component.html'
})
export class VideoDialogComponent {

    visible = false;

    title: string;
    videoUrl: string;

    videos: { title: string, url: string }[] = [];
    currentVideo: number;

    public show(files: string[], $entry: string, index: number) {
        this.visible = true;

        this.videos = files.map(file => ({
            url: new URL(`./api/stream/${$entry}/${files.indexOf(file)}`, document.baseURI).href,
            title: file.replace(/^.*\//, ''),
            _active: file === files[index]
        }));

        this.currentVideo = this.videos.findIndex(v => v['_active']);
        this.playVideo();
    }

    playPreviousVideo() {
        this.currentVideo--;
        this.playVideo();
    }

    playNextVideo() {
        this.currentVideo++;
        this.playVideo();
    }

    openExternal() {
        window.open(this.videoUrl);
        this.visible = false;
    }

    playVideo() {
        let video = this.videos[this.currentVideo];
        if (video) {
            this.videoUrl = video.url;
            this.title = video.title;
        } else {
            this.videoUrl = null;
            this.visible = false;
        }
    }

}
