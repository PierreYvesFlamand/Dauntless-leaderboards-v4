import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import pako from 'pako';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    fetch('http://localhost:4200/allData.json.compressed').then(res => res.arrayBuffer()).then(content => {
      console.log(JSON.parse(pako.inflate(new Uint8Array(content), { to: 'string' })));
    })
  }
  title = 'website';
}
