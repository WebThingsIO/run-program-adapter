/**
 *
 * RunProgramAdapter - an adapter for executing helper programs.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const {Adapter, Database, Device, Property, Event} = require('gateway-addon');
const {exec} = require('child_process');

class RunProgramDevice extends Device {
  constructor(adapter, programConfig) {
    const id = `runProgram-${programConfig.name}`;
    super(adapter, id);

    this.programConfig = programConfig;
    this.name = programConfig.name;

    console.log('config:', this.programConfig);

    this.initRunProgram();
    this.adapter.handleDeviceAdded(this);
  }

  asDict() {
    const dict = super.asDict();
    dict.programConfig = this.programConfig;
    return dict;
  }

  initRunProgram() {
    this['@type'] = ['RunProgram'];
    const programProperty = new Property(
      this,
      'program',
      {
        '@type': 'RunProgramProperty',
        label: 'Program',
        type: 'string',
        readOnly: true,
      });
    programProperty.value = this.programConfig.program;
    this.properties.set('program', programProperty);

    this.addAction('run');
    this.addEvent('success');
    this.addEvent('error');
  }

  performAction(action) {
    const program = this.programConfig.program;
    console.log(`${this.programConfig.name}: Running: ${program}`);

    action.start();

    return new Promise((resolve, reject) => {
      exec(program, (err, stdout, stderr) => {
        stdout = stdout.replace(/\n$/, '');
        if (stdout) {
          const stdout_lines = stdout.split(/\n/g);
          for (const stdout_line of stdout_lines) {
            console.log(`${this.programConfig.name}: ${stdout_line}`);
          }
        }
        stderr = stderr.replace(/\n$/, '');
        if (stderr) {
          const stderr_lines = stderr.split(/\n/g);
          for (const stderr_line of stderr_lines) {
            console.error(`${this.programConfig.name}: ${stderr_line}`);
          }
        }
        if (err) {
          const msg = `Failed to run "${program}"`;
          console.error(msg);
          action.finish();
          reject(msg);
        } else {
          this.eventNotify(new Event(this, 'ran'));
          action.finish();
          resolve();
        }
      });
    });
  }
}

class RunProgramAdapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, manifest.name, manifest.name);
    addonManager.addAdapter(this);

    for (const programConfig of manifest.moziot.config.programs) {
      new RunProgramDevice(this, programConfig);
    }
  }
}

function loadRunProgramAdapter(addonManager, manifest, _errorCallback) {
  // Attempt to move to new config format
  if (Database) {
    const db = new Database(manifest.name);
    db.open().then(() => {
      return db.loadConfig();
    }).then((_config) => {
      new RunProgramAdapter(addonManager, manifest);
    });
  }
}

module.exports = loadRunProgramAdapter;
