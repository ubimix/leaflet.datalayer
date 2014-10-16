#!/bin/bash
grunt inc && grunt commit && git push && git push --tags && npm publish