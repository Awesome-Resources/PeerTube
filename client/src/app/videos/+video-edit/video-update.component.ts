import { Component, OnInit } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { NotificationsService } from 'angular2-notifications'
import 'rxjs/add/observable/forkJoin'
import { VideoPrivacy } from '../../../../../shared/models/videos'
import { ServerService } from '../../core'
import { AuthService } from '../../core/auth'
import { FormReactive } from '../../shared'
import { ValidatorMessage } from '../../shared/forms/form-validators/validator-message'
import { populateAsyncUserVideoChannels } from '../../shared/misc/utils'
import { VideoEdit } from '../../shared/video/video-edit.model'
import { VideoService } from '../../shared/video/video.service'

@Component({
  selector: 'my-videos-update',
  styleUrls: [ './shared/video-edit.component.scss' ],
  templateUrl: './video-update.component.html'
})

export class VideoUpdateComponent extends FormReactive implements OnInit {
  video: VideoEdit

  form: FormGroup
  formErrors: { [ id: string ]: string } = {}
  validationMessages: ValidatorMessage = {}
  videoPrivacies = []
  userVideoChannels = []

  constructor (
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private notificationsService: NotificationsService,
    private serverService: ServerService,
    private videoService: VideoService,
    private authService: AuthService
  ) {
    super()
  }

  buildForm () {
    this.form = this.formBuilder.group({})
    this.form.valueChanges.subscribe(data => this.onValueChanged(data))
  }

  ngOnInit () {
    this.buildForm()

    this.serverService.videoPrivaciesLoaded
      .subscribe(
        () => this.videoPrivacies = this.serverService.getVideoPrivacies()
      )

    populateAsyncUserVideoChannels(this.authService, this.userVideoChannels)

    const uuid: string = this.route.snapshot.params['uuid']
    this.videoService.getVideo(uuid)
      .switchMap(video => {
        return this.videoService
          .loadCompleteDescription(video.descriptionPath)
          .do(description => video.description = description)
          .map(() => video)
      })
      .subscribe(
        video => {
          this.video = new VideoEdit(video)

          // We cannot set private a video that was not private
          if (video.privacy !== VideoPrivacy.PRIVATE) {
            const newVideoPrivacies = []
            for (const p of this.videoPrivacies) {
              if (p.id !== VideoPrivacy.PRIVATE) newVideoPrivacies.push(p)
            }

            this.videoPrivacies = newVideoPrivacies
          }

          this.hydrateFormFromVideo()
        },

        err => {
          console.error(err)
          this.notificationsService.error('Error', err.message)
        }
      )
  }

  checkForm () {
    this.forceCheck()

    return this.form.valid
  }

  update () {
    if (this.checkForm() === false) {
      return
    }

    this.video.patch(this.form.value)

    this.videoService.updateVideo(this.video)
                     .subscribe(
                       () => {
                         this.notificationsService.success('Success', 'Video updated.')
                         this.router.navigate([ '/videos/watch', this.video.uuid ])
                       },

                       err => {
                         this.notificationsService.error('Error', err.message)
                         console.error(err)
                       }
                      )

  }

  private hydrateFormFromVideo () {
    this.form.patchValue(this.video.toJSON())
  }
}
