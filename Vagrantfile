Vagrant.configure("2") do |config|
    config.vm.box = "debian/jessie64"
    config.vm.network :private_network, ip: "192.168.50.5"
    
    config.vm.provider "virtualbox" do |v|
        v.memory = 1024
        v.cpus = 2
    end

    # For windows hosts use smb instead of nfs as synced folder type
    if (/cygwin|mswin|mingw|bccwin|wince|emx/ =~ RUBY_PLATFORM) != nil
        config.vm.synced_folder ".", "/vagrant", type: "smb"
    else
        config.vm.synced_folder ".", "/vagrant", type: "nfs"
    end

    config.vm.provision "shell", path: "provision/provision.sh"
end
