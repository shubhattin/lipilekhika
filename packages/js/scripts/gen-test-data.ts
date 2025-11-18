#!/usr/bin/env bun

import { lipi_parivartak } from './tools/old_lipi_lekhika';

const text = await lipi_parivartak('namO bhUtanAtham', 'en', 'hi');
console.log(text);
