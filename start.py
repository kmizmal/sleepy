#!/usr/bin/python3
#coding: utf-8
import os
import time
c = 0
while True:
    c += 1
    print(f'Starting server #{c}')
    r = os.system('python3 server.py')
    print(f'#{c} exited with code {r}\nwaiting 5s')
    time.sleep(5)