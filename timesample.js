//
// TIMESAMPLE.js
//
// This class can be used to take timing measurements of javascript code.
// 
// It can be used one of two ways:
//  (1) Pass a function with `ACC()`; calculates the time to execute this function.
//  (2) Mark the start and stop with `ACC_START()` and `ACC_STOP()`.
// The name of the measurement is passed as `name` to each of these methods.
// 
// When you are completely done measuring, reconcile and report the measurements
// using `RECONCILE()` and `REPORT()`, respectively. Reconciling should only
// ever be done once.
//

class TIMESAMPLE {
  // All time samples for the script
  samples = {
    "profile": {
      'total_time': 0,
      'self_time': NaN,
      'avg_total_time': NaN,
      'avg_self_time': NaN,
      'num_calls': 0
    },
    "children": {}
  };

  // Are we actively recording?
  recording = true;

  // Active recordings
  active = {};

  // Accumulate time for a function
  //  name  list of names identifying the hierarchy of a function's execution
  //  fnct  the function we'd like to record timing of
  ACC(name, fnct) {
    let start = millis();
    let result = fnct();
    let end = millis();
    let elapsed = end - start;
    if (this.recording) this._add([name].ft(), elapsed);
    return result;
  }

  // Use these two methods together when a function cannot be wrapped
  ACC_START(name) {
    this.active[name.join('___')] = millis();
  }
  ACC_STOP(name) {
    let end = millis();
    let start = this.active[name.join('___')];
    let elapsed = end - start;
    if (this.recording) this._add([name].ft(), elapsed);
  }

  // Get a sample object
  _get(name, samples = null) {
    var _ = this;
    if (!samples) samples = _.samples;
    if (!(name[0] in samples['children'])) {
      samples['children'][name[0]] = {
        'profile': {
          'total_time': 0, // time spent on this function and all children
          'self_time': NaN, // time spent on this function only
          'avg_total_time': NaN, // average total time
          'avg_self_time': NaN, // average self time
          'num_calls': 0  // number of times this function has been called
        },
        'children': {}
      };
    }
    if (name.length == 1) {
      return samples['children'][name[0]];
    } else {
      return _._get(
        name.splice(1),
        samples['children'][name[0]]
      )
    }
  }

  // Add a measurement
  _add(name, time) {
    var _ = this;
    var sample = _._get(name)['profile'];
    sample['total_time'] += time;
    sample['num_calls'] += 1;
  }

  // Call this once at the completion of this script
  // to calculate the self time for each function
  RECONCILE() {
    var _ = this;
    if (!_.recording) return;

    _._reconcile(_.samples);

    // stop recording now
    _.recording = false;
  }

  // Recursively reconcile samples
  _reconcile(sample) {
    var _ = this;
    var profile = sample['profile'];

    // Find the sum of all children's total time
    var sum = SM(E(sample['children']).map(([k, v]) => _._reconcile(v)));

    // Calculate the // If this sample has calls, then calculate its self time
    if (profile['num_calls'] > 0) {
      profile['self_time'] = profile['total_time'] - sum;
    }

    // Set the total time of this sample if it has never been called
    if (profile['num_calls'] == 0) {
      profile['total_time'] = sum;
    }

    // Calculate average times
    if (profile['num_calls'] > 0) {
      profile['avg_total_time'] = profile['total_time'] / profile['num_calls'];
      profile['avg_self_time'] = profile['self_time'] / profile['num_calls'];
    }

    // The return value is only a rough approximate. 
    // Since time can be doubly counted depending on how these methods are used,
    // technically only total_time should be returned if there is more than one call.
    // return profile['num_calls'] == 0 ? 0 : profile['total_time']; 
    return profile['total_time'];
  }

  // Print a report to the console
  REPORT() {
    var _ = this;

    var textPads = 30;
    var numPads = 8;

    var text = '%c'
      + 'Function'.padEnd(textPads)
      + '#Calls'.padEnd(numPads)
      + 'Total'.padEnd(numPads)
      + 'AvgT'.padEnd(numPads)
      + 'Self'.padEnd(numPads)
      + 'AvgS'.padEnd(numPads)
    var colors = ['background: gray; color: white']

    var [_text, _colors] = _._report('Global', _.samples, 1, textPads, numPads);

    // Convert numerical values in colors to actual colors, mapping min to max
    var value_colors = UZ(_colors);
    value_colors.forEach((values, value_index) => {
      if (typeof (values[0]) == 'string') return;
      var finite_values = values.filter(i => isFinite(i));
      finite_values = finite_values.map(i => LG(i, 10))
      var lo = I(...finite_values);
      var hi = X(...finite_values);
      if (!isFinite(lo)) lo = 0;
      if (!isFinite(hi)) hi = 0;
      values.forEach((value, instance_index) => {
        if (!isFinite(value)) value = 0;
        var param = map(LG(value, 10), lo, hi, 0, 1, 1);
        value_colors[value_index][instance_index] = "color: " + HX(color(pow(param, .5), pow(1 - param, .5), 0));
      })
    })
    _colors = UZ(value_colors).ft()

    text += _text;
    colors = colors.concat(_colors);
    console.log(text, ...colors);
  }

  // recursive report
  _report(name, sample, curLevel, textPads, numPads) {

    var decimalPlaces = 2;
    var profile = sample['profile'];

    var formatNumber = (n) => {
      return (isNaN(n) ? '' : round(n, decimalPlaces).toString()).padEnd(numPads, ' ');
    }

    var text = '';
    var colors = [[
      'color: black',
      profile['total_time'],
      profile['avg_total_time'],
      profile['self_time'],
      profile['avg_self_time']
    ]];
    text += ''
      + '%c' + (new Array(curLevel).join(' ') + name).padEnd(textPads, ' ')
      + (profile['num_calls'] == 0 ? '' : profile['num_calls'].toString()).padEnd(numPads, ' ')
      + '%c' + formatNumber(profile['total_time'])
      + '%c' + formatNumber(profile['avg_total_time'])
      + '%c' + formatNumber(profile['self_time'])
      + '%c' + formatNumber(profile['avg_self_time'])
      + '\n';

    E(sample.children).forEach(([k, v]) => {
      var [_text, _colors] = this._report(k, v, curLevel + 1, textPads, numPads);
      text += _text;
      colors = colors.concat(_colors);
    })

    return [text, colors];
  }
}
// TS = new TIMESAMPLE();
