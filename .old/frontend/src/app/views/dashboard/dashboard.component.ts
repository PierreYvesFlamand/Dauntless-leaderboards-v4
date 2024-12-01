import { Component } from '@angular/core';
import { DatabaseService } from '../../services/database.service';
import { SharedService } from '../../services/shared.service';

@Component({
  selector: 'dl-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: false
})
export class DashboardComponent {
  public dashboardData?: API_DASHBOARD;

  constructor(
    private databaseService: DatabaseService,
    public sharedService: SharedService
  ) {
    this.fetchData();
  }

  private async fetchData() {
    const newDashboardData = await this.databaseService.fetch<API_DASHBOARD>('dashboard');
    if (newDashboardData) {
      this.dashboardData = newDashboardData;
    }
  }
}
