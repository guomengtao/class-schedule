var fs=require("fs"),p=require("path");
var d=p.join(__dirname,"dist");
var o="dist/ contents:\n";
try{fs.readdirSync(d).forEach(function(f){var s=fs.statSync(p.join(d,f));o+="  "+f+" ("+(s.size/1024).toFixed(1)+" KB, modified "+s.mtime.toISOString()+")\n"})}catch(e){o+="  ERROR: "+e.message+"\n"}
o+="\nmanifest version: "+JSON.parse(fs.readFileSync(p.join(__dirname,"src","manifest.json"),"utf8")).versionName+"\n";
fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/_dist_info.txt",o);
console.log("DONE");