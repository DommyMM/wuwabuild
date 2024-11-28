import multiprocessing

workers = multiprocessing.cpu_count() * 2 + 1
timeout = 120
bind = "0.0.0.0:8080"
reload = False
max_requests = 1000
max_requests_jitter = 50