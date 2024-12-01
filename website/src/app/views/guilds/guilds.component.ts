import { AfterViewInit, Component } from '@angular/core';
import { SharedService } from '../../services/shared.service';
import { DatabaseService, WEBSITE_GUILD } from '../../services/database.service';

@Component({
  selector: 'dl-guilds',
  templateUrl: './guilds.component.html',
  styleUrl: './guilds.component.scss',
  standalone: false
})
export class GuildsComponent implements AfterViewInit {
  constructor(
    public sharedService: SharedService,
    public databaseService: DatabaseService
  ) { }

  ngAfterViewInit(): void {
    this.applyFilter();
  }

  public guilds: WEBSITE_GUILD[] = [];
  public total: number = 0;
  public isLoading: boolean = true;
  public filters: {
    textSearch: string
    orderByField: string | null
    orderByDirection: 'ASC' | 'DESC'
    page: number
  } = {
      textSearch: '',
      orderByField: 'rating',
      orderByDirection: 'DESC',
      page: 1
    };

  public async applyFilter() {    
    this.guilds = [];
    this.isLoading = true;

    let response = {
      data: this.databaseService.data.guilds,
      total: 0
    };

    response.data = response.data.filter(r => r.name.toLowerCase().includes(this.filters.textSearch.toLowerCase()));
    response.data.sort((a, b) => {
      return b.rating - a.rating;
    });

    response.total = response.data.length;
    response.data = response.data.slice(0 + (this.filters.page - 1) * 20, 20 + (this.filters.page - 1) * 20);

    if (!response) return;
    this.isLoading = false;
    this.guilds = response.data;
    this.total = response.total;
  }

  public changeFilter(key: string) {
    if (this.filters.orderByField !== key) {
      this.filters.orderByField = key;
      this.filters.orderByDirection = 'DESC';
    } else {
      if (this.filters.orderByDirection === 'DESC') {
        this.filters.orderByDirection = 'ASC';
      } else {
        this.filters.orderByField = null;
      }
    }

    this.applyFilter();
  }

  public getArrowIcon(key: string): string {
    if (this.filters.orderByField !== key) return 'fa-arrows-up-down';
    else if (this.filters.orderByDirection === 'ASC') return 'fa-arrow-up-long';
    return 'fa-arrow-down-long';
  }

  public Number: (str: string) => number = str => Number(str);

  public getNumberOfPages(): number {
    return Math.ceil(this.total / 20);
  }
}
