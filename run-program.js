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
const manifest = require('./manifest.json');

class RunProgramDevice extends Device {
  constructor(adapter, programConfig) {
    const id = `runProgram-${programConfig.name}`;
    super(adapter, id);

    this.name = programConfig.name;
    this.command = programConfig.program;

    this.initRunProgram();
    this.adapter.handleDeviceAdded(this);
  }

  initRunProgram() {
    const programProperty = new Property(
      this,
      'program',
      {
        title: 'Program',
        type: 'string',
        readOnly: true,
      }
    );
    programProperty.setCachedValue(this.command);
    this.properties.set('program', programProperty);

    this.addAction('run');
    this.addEvent('success');
    this.addEvent('error');
  }

  performAction(action) {
    console.log(`${this.name}: Running: ${this.command}`);

    action.start();

    return new Promise((resolve) => {
      exec(this.command, (err, stdout, stderr) => {
        stdout = stdout.replace(/\n$/, '');
        if (stdout) {
          const stdout_lines = stdout.split(/\n/g);
          for (const stdout_line of stdout_lines) {
            console.log(`${this.name}: ${stdout_line}`);
          }
        }

        stderr = stderr.replace(/\n$/, '');
        if (stderr) {
          const stderr_lines = stderr.split(/\n/g);
          for (const stderr_line of stderr_lines) {
            console.error(`${this.name}: ${stderr_line}`);
          }
        }

        if (err) {
          this.eventNotify(new Event(this, 'error'));
        } else {
          this.eventNotify(new Event(this, 'success'));
        }

        action.finish();
        resolve();
      });
    });
  }
}

class RunProgramAdapter extends Adapter {
  constructor(addonManager, config) {
    super(addonManager, manifest.id, manifest.id);
    addonManager.addAdapter(this);

    for (const programConfig of config.programs) {
      new RunProgramDevice(this, programConfig);
    }
  }
}

function loadRunProgramAdapter(addonManager) {
  const db = new Database(manifest.id);
  db.open().then(() => {
    return db.loadConfig();
  }).then((config) => {
    new RunProgramAdapter(addonManager, config);
  });
}

module.exports = loadRunProgramAdapter;
