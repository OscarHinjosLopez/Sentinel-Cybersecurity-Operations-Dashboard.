import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Icon } from '../icon/icon';
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, Icon],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {}
