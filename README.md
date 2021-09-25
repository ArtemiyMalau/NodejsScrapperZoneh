# ZoneHScrapper

Implementation of "zone-h.org" website parser with dumping parsed data in CSV format functionality


## Setup
Execute npm command to install all dependencies from package files
~~~
npm install
~~~


## Startup
Execute [main.js](src/main.js) script from command line to start parsing process
~~~
node src/main.js
~~~


## Script arguments
### `page`
Page of data on site which parser will starts from. **1** by default

### `domain`
A substring of hacked site base domain.
For example **domain=ru** will dump hacked sites only with **ru** substring in domain name like example.ru, gov.test.ru, russia.edu and so on.

### `city_ip_name`
The name of the city whose ip addresses will be searched among hacked sites' ip addresses.
For example **city_ip_name=Moscow** will search sites located in Moscow city.

### `ip_file`
File contains ips range which will be compare with parsed sites' ip. Dump site if site's ip in range of any interested ip ranges.
File must containg ips CIDR format with each ip of ips list on newline like:
~~~
50.165.190.0/23
198.51.100.14/24
192.24.12.0/22
~~~

### `output_file`
File where script will dump parsed data to. By default filename is *output.csv*


## Examples
~~~
node src/main.js --page=2 --domain=.ru
~~~
~~~
node src/main.js --page=10 --city_ip_name=москва --output_file=MoscowDump.csv
~~~