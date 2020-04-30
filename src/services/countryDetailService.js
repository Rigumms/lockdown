import { EventTargetShim } from '../utils/EventTargetShim.js';
import format from 'date-fns/format';
import addDays from 'date-fns/addDays';

class CountryDetailService extends EventTargetShim {
  constructor() {
    super();
    this.cache = {};
  }

  async getDetails(opts) {
    let { iso2, date } = opts;
    iso2 = encodeURI(iso2);

    const startDate = format(addDays(new Date(), -14), 'yyyy-MM-dd');
    const endDate = format(addDays(new Date(), 56), 'yyyy-MM-dd');

    if (!/^[a-zA-Z]{2}$/.test(iso2)) {
      return;
    }
    
    let cacheKey = `${iso2}${startDate}${endDate}`;
    
    if (opts.forceRefresh || this._shouldInvalidate() || this.cache[cacheKey]?.status === 'failed' || !this.cache[cacheKey]) {
      try {
        this.cache[cacheKey] = {};
        const res = await (await fetch(`http://localhost:3000/status/${iso2}/${startDate}/${endDate}`)).json();
        this.cache[cacheKey] = res;
      } catch (_) {
        this.cache[cacheKey] = {
          status: 'failed',
        };
      }
    }
    var data = this.cache[cacheKey];
    if (data.status === 'failed') {
      this.dispatchEvent(new Event('change'));
      return data;
    }

    const travel = {};
    var dateFormatted = format(date, 'yyyy-MM-dd');

    var res = data[dateFormatted];
    for (const type of ['land', 'flight', 'sea']) {
      for (const { label, value } of res.lockdown[type]) {
        if (Array.isArray(travel[label])) {
          travel[label].push(value);
        } else {
          travel[label] = [value];
        }
      }
    }

    var result = {
      status: 'success',
      date: res.lockdown.date,
      measures: res.lockdown.measure,
      travel,
      max_gathering: res.lockdown.max_gathering[0].value,
    };
    this.__lastUpdate = Date.now();
    this.dispatchEvent(new Event('change'));
    return result;
  }
}

export const countryDetailService = new CountryDetailService();
