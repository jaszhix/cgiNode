# cgiNode

cgiNode enables a Node.JS instance to run on any server that supports CGI. It is a fork of [Uei Richo](https://github.com/UeiRicho/cgi-node)'s original project.

## Features
* HTTP request handling
  * URL object
  * Headers
  * Cookies
  * Queries
  * POST data
* HTTP response handling
  * Header setting
  * Cookies
* Session management
* Exception handling

## Differences From Original Project

* Promise exception handling.
* Debug logging.
* DOM JS Pass-through.
  * Inject JS the browser interprets into script tags.
  * ```console.log``` the Node.JS scope, and view it in the browser console.
  * Logging can show circular structures thanks to Douglas Crockford's [cycle.js](https://github.com/douglascrockford/JSON-js).
* Singular constructor namespace for cgiNode methods.
* The original script executed the CGI VM instance with ```vm.createInContext```, but this version uses ```vm.createInNewContext```, so you have access to all of Node.JS' global scope.
* Fixed POST data retrieval when data is being submitted with the ```x-www-form-urlencoded``` header.
* Fixed POST data not being buffered to base64 before being handed off to the context.

## Getting Started

* Install Node.JS. If you are on a shared server with SSH access, I suggest you try out [NVM](https://github.com/creationix/nvm). Otherwise you can easily install Node on a shared/limited server environment with niutech's [Node.php](https://github.com/niutech/node.php) file.
* [Download](https://github.com/jaszhix/cgiNode/blob/master/dist/cgiNode.js) cgiNode.js from the ```dist``` directory.
* Move or upload the file to your project's cgi-bin directory and ```chmod 755 cgiNode.js```.
* Edit the top line of cgiNode.js so it points to the directory of your installed Node.JS binary.
```sh
  #!/usr/bin/node
```
* Add an Action handler for cgiNode to your ```.htaccess``` file.

```
Action cgiNode /cgi-bin/cgiNode.js
AddHandler cgiNode .jsml
```
* Create a file with a ```.jsml``` extension (or whatever you feel like naming it in ```.htaccess```), and add code that looks like this.
```
<? node.include('app.js') ?>
```

Assuming your JS file is named ```app.js```, and residing in the same directory as your JSML file.

* Edit app.js like you would any Node JS file.

## API

### node.include(Script file path)

Includes the script inside the embedded script file (JSML).

### node.write(String);

Writes to the body of the response.

### node.json(Object)

Behaves like ```node.write``` except it will stringify JSON.

### node.info

Displays the server information, similar to ```phpInfo()```.

### node.script(JS code)

Injects JS into the JSML page's script tags for the browser to interpret. This is useful if you are trying to build an isomorphic/universal application, and need to add client side JS. The major caveat to this is you do not have any access to the browser's scope.

### console.log(args)

Allows you to see console logging in your browser's console from the Node.JS scope.

### node.log(Object)

Set the logging file path in ```config.logPath``` in cgiNode.js, then call it with an object. It will be stringified to JSON with a time stamp, and a ```debug.log``` file will be created.

### node.request.url
### node.request.method
### node.request.query

Returns the URL query string as an object.

### node.request.post

If the HTTP method is POST, this object will be populated.

### node.request.server

Returns server variables. This fork has increased access to the global scope, so you can access all of the server information with ```process.env```.

### node.request.headers
### node.request.cookies
### node.request.session
### node.request.form
### node.response.isHeadersSent
### node.response.headers

The object of headers the Node instance will respond with. You can set the headers by mutating this object.

### node.response.sendHeaders()

## Rationale

The original author abandoned his project, and I think being able to run Node in any environment, though maybe less ideal, is a handy thing to have. Unlike the original project though, I am not advising anyone to use this in production. This fork exists to help increase my understanding of server side technologies.