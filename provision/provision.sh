echo "Start provisioning"
DEBIAN_FRONTEND=noninteractive apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx

echo "Copy and link configs"
# nginx
cp /vagrant/provision/files/etc/nginx/sites-available/site.conf /etc/nginx/sites-available/
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/site.conf
ln -s /etc/nginx/sites-available/site.conf /etc/nginx/sites-enabled

echo "Restart services"
service nginx restart