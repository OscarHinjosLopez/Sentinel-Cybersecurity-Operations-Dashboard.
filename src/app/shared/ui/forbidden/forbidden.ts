import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Icon } from '../icon/icon';
@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, MatButtonModule, Icon],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
})
export class Forbidden {}
