#!/usr/bin/node
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

//#!/home2/jaszhiz/.nvm/versions/node/v4.3.0/bin/node

/*
cycle.js - https://github.com/douglascrockford/JSON-js/blob/master/cycle.js
*/

"function" != typeof JSON.decycle && (JSON.decycle = function (e) {
  "use strict";
  var t = [],
      r = [];return function n(e, a) {
    var o, i, f;if (!("object" != (typeof e === "undefined" ? "undefined" : _typeof(e)) || null === e || e instanceof Boolean || e instanceof Date || e instanceof Number || e instanceof RegExp || e instanceof String)) {
      for (o = 0; o < t.length; o += 1) {
        if (t[o] === e) return { $ref: r[o] };
      }if (t.push(e), r.push(a), "[object Array]" === Object.prototype.toString.apply(e)) for (f = [], o = 0; o < e.length; o += 1) {
        f[o] = n(e[o], a + "[" + o + "]");
      } else {
        f = {};for (i in e) {
          Object.prototype.hasOwnProperty.call(e, i) && (f[i] = n(e[i], a + "[" + JSON.stringify(i) + "]"));
        }
      }return f;
    }return e;
  }(e, "$");
}), "function" != typeof JSON.retrocycle && (JSON.retrocycle = function retrocycle($) {
  "use strict";
  var px = /^\$(?:\[(?:\d+|\"(?:[^\\\"\u0000-\u001f]|\\([\\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*\")\])*$/;return function rez(value) {
    var i, item, name, path;if (value && "object" == (typeof value === "undefined" ? "undefined" : _typeof(value))) if ("[object Array]" === Object.prototype.toString.apply(value)) for (i = 0; i < value.length; i += 1) {
      item = value[i], item && "object" == (typeof item === "undefined" ? "undefined" : _typeof(item)) && (path = item.$ref, "string" == typeof path && px.test(path) ? value[i] = eval(path) : rez(item));
    } else for (name in value) {
      "object" == _typeof(value[name]) && (item = value[name], item && (path = item.$ref, "string" == typeof path && px.test(path) ? value[name] = eval(path) : rez(item)));
    }
  }($), $;
});

/*
cgiNode2
Based on the work of Uei Richo (Uei.Richo@gmail.com) - https://github.com/UeiRicho/cgi-node
*/

var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
config.sessionTimeOut = parseInt(config.sessionTimeOut);
config.version = '0.3';
var vm = require('vm');
var url = require('url');
var Path = require('path');
var crypto = require('crypto');
var queryString = require('querystring');

function node(onFinished) {
  var _this = this;

  if (!(this instanceof node)) {
    return new node(onFinished);
  }
  node.prototype.node = this;
  /*
   This array contains all the scripts that have been included within the session.
   The script structure is: {id: <integer>, path: <string>, code: <string>, content: [<string>]};
  */
  node.prototype.__scripts = [];

  /*
   This object is created before the requested script is executed. It represents the HTTP request
   and contains all the request information. This includes the headers, URL, query string, post data
   and server information.
   
   See cgiHttpRequest for more details.
  */
  node.prototype.request = new cgiHttpRequest(onFinished);

  /*
   This object is created by the initially that implements header and write methods to send data back to the 
   client.
   
   See cgiHttpResponse for more details.
  */
  node.prototype.response = new cgiHttpResponse();

  /*
   This is the current user session object. It is automatically saved and loaded for each request.
   The session is sent through Cookies to the client which is automatically sent back and forth for every request.
   
   NOTE: this must be created after the request has been parsed.
  */
  node.prototype.session = new cgiHttpSession(this.request, this.response);

  /*
   This is an alias to the response.write method.
   Can be used directly within CGI script, example: write('Hello World')
  */
  node.prototype.write = this.response.write;
  node.prototype.json = this.response.json;
  node.prototype.ip = this.session.ipAddress;

  /*
   The node process object is made available to the scripts for any additional information they may require.
   See http://nodejs.org/documentation/api/ under "process" for more information.
  */
  node.prototype.process = process;
  node.prototype.require = require;

  /*
   Resolve the file path relative to the root of the website as defined within the configuration,
   or if not specified then the base script path.
  */
  node.prototype.mapPath = function (path) {
    var root = Path.dirname(this.request.server.path_translated.toString());
    return Path.resolve(root, path);
  };

  /*
   Executes the given file within the current context. 
   If the given file path is is a '.js' file, it is executed as is, otherwise it is assumed to be an ASP page and is parsed first.
  */
  node.prototype.include = function (filePath, options) {
    // If options is not defined then assume UTF8 as including.
    if (options === undefined) {
      options = {
        encoding: 'utf8'
      };
    }

    // Resolve the script path.
    var path = _this.mapPath(filePath);

    // Get the script file content.
    var content = fs.readFileSync(path, options);

    // If the file extension is not '.js' then parse out the different code and content sections.
    // TODO: use the configuration object to check if it is a script file or not.
    var script;
    if (Path.extname(filePath) !== config.scriptExtension) {
      script = cgiParser.script(_this.__scripts.length, path, content.toString());
    }

    // Otherwise just create a new script object
    else {
        script = {
          id: _this.__scripts.length,
          path: path,
          script: null,
          code: content,
          content: []
        };
      }

    // Push the script onto the global script array.
    _this.__scripts.push(script);

    // Execute the script within the context.
    vm.runInNewContext(script.code, _this, script.path);
  };
  /*
   This method is similar to PhpInfo(). It outputs all the HTTP request and server information and variables
   to the stream in HTML format.
  */
  node.prototype.info = function () {
    var drawObject = function drawObject(title, object) {
      _this.response.write('<tr><th colspan="2">' + title + '</th></tr>');
      for (var name in object) {
        var value = object[name];
        if (typeof value === 'function') {
          continue;
        } else if ((typeof value === "undefined" ? "undefined" : _typeof(value)) === 'object') {
          var htmlValue = '<table class="NodeASPTable" border="0" style="margin: 0px">';
          for (var subName in value) {
            htmlValue += '<tr><td>' + subName + '</td><td>' + value[subName] + '</td></tr>';
          }
          value = htmlValue + '</table>';
        }

        process.stdout.write('<tr><td>' + name + '</td><td>' + value + '</td></tr>');
      }
    };

    _this.response.write('<style>.Logo{ text-align: left; font-size: 36px !important; } .NodeASPTable{ font-family: arial; font-size: 12px; margin: auto; border-collapse: collapse; width: 600px} .NodeASPTable TH{ background-color: #303030; color: white; font-size: 14px; padding: 10px} .NodeASPTable TD{ padding: 5px; } .NodeASPTable TR TD:nth-child(1){ background: #d9ebb3; }</style>');
    _this.response.write('<table class="NodeASPTable" border="1">');
    _this.response.write('<tr><th colspan="2" class="Logo">CGI-NODE v' + config.version + '</th></tr>');

    var session = {
      id: _this.session.id,
      path: _this.session.path,
      ipAddress: _this.session.ipAddress
    };

    drawObject('Node Versions', process.versions);
    drawObject('Configuration Variables', process.config.variables);
    drawObject('Environment', process.env);
    drawObject('Features', process.features);
    drawObject('Native Modules', process.moduleLoadList);
    drawObject('CGI Command Line Arguments', process.argv);
    drawObject('Server Variables', _this.request.server);
    drawObject('HTTP Request Headers', _this.request.headers);
    drawObject('HTTP Request Cookies', _this.request.cookies);
    drawObject('Session', session);
    drawObject('Session Cookies', _this.session.cookies);
    drawObject('Session Data', _this.session.data);
    drawObject('URL Query String', _this.request.query);
    drawObject('Post Form', _this.request.post.form);
    drawObject('Post Files', _this.request.post.files);
    drawObject('Post Parts', _this.request.post.parts);

    _this.response.write('</table>');
  };

  /*
  DOM Context Pass-through
  */

  node.prototype.script = function (code) {
    return _this.response.write("<script>" + code + "</script>");
  };
  node.prototype.console = {
    log: function log(value) {
      _this.script("console.log(" + JSON.stringify(JSON.decycle(value)) + ")");
    },
    warn: function warn(value) {
      _this.script("console.warn(" + JSON.stringify(JSON.decycle(value)) + ")");
    },
    error: function error(value) {
      _this.script("console.error(" + JSON.stringify(JSON.decycle(value)) + ")");
    }
  };
  node.prototype.timeNow = new Date(Date.now());
  node.prototype.log = function (data) {
    var timeStamp = _this.timeNow.toTimeString();
    var json = {
      time: timeStamp,
      data: data
    };
    var output = JSON.stringify(json);
    fs.appendFile("" + config.logPath, output + '\n', {
      flags: 'w'
    });
  };
}

function cgiHttpSession(request, response) {
  var self = this;

  /*
   The unique session ID for the current user.
  */
  this.id = null;

  /*
   The full file path of the session file where the data will saved and restored.
  */
  this.path = null;

  /*
   The IP address of the user, this is used as a simple check to ensure the request is coming from the original IP addresses
   that created this session. If the IP address changed then the session will no longer be accessible.
  */
  this.ipAddress = null;

  /*
   Server side cookies that are saved and loaded with the session.
   This is an object of name:  {name: <string>, value: <string>, expires: <date>, domain: <string>, path: <string>, httpOnly: <boolean>, secure: <boolean>}
  */
  this.cookies = {};

  /*
   This is the suer stored session data. Users can store anything they want there and accesses it at every request.
   For example: session.data.userId = 10;
  */
  this.data = {};

  /*
   Performs the session operations of loading the session or creating a new if it does not exist.
  */
  this.init = function () {
    // Set the session within the request object and response object, these objects need access to the session.
    request.session = this;
    response.session = this;

    // Get the session ID from the cookies. If there is no session ID stored then create a new ID and create a new file.
    this.id = request.cookies.hasOwnProperty(config.sessionCookie) ? request.cookies[config.sessionCookie] : this.create();
    var path = Path.join(config.sessionPath, this.id);

    // If the path doesn't exist, then create it.
    if (!fs.existsSync(config.sessionPath)) {
      fs.mkdirSync(config.sessionPath, 700);
    }

    // If the file does not exist then create another ID.
    if (!fs.existsSync(path)) {
      this.id = this.create();
    }

    // Load the session information.
    // TODO: handle exceptions, if occurs create new session.
    var session = JSON.parse(fs.readFileSync(Path.join(config.sessionPath, this.id)));

    // Ensure the session is actually the requester's session.
    // TODO: create new session if this occurs. Don't throw exception.
    if (session.ipAddress != request.server.remote_addr) {
      throw "Invalid session ID!";
    }

    // Copy the session object data into this object.
    for (var name in session) {
      this[name] = session[name];
    }

    // TODO: At this point the client has already sent it's cookies as well. We can merge the client cookies into the session cookies.
  };

  /*
   Saves the session data back to the file.
  */
  this.save = function () {
    // Copy the data into a new object.
    var session = {
      id: self.id,
      path: self.path,
      ipAddress: self.ipAddress,
      cookies: self.cookies,
      data: self.data
    };

    // Write the session back to the
    fs.writeFileSync(self.path, JSON.stringify(session));
  };

  /*
   Creates a new session with a new ID and saves the empty session to file.
   Uses the client's IP address, port and current time + random number to generate a new session ID.
   Stores the current client IP address within the session ID. This is used as extra check.
  */
  this.create = function () {
    // Generate a new ID based on some fixed and random factors.
    var date = new Date();
    var idString = request.server.remote_addr + request.server.remote_port + request.server.unique_id + date.value + Math.random();
    var id = crypto.createHash('md5').update(idString).digest('hex');

    // TODO: should check if this already exists, if so then generate a new random number session. **** IMPORTANT ****

    // Create the session object.
    var session = {
      id: id,
      path: Path.join(config.sessionPath, id),
      ipAddress: request.server.remote_addr,
      cookies: {},
      data: {}
    };

    // Add the session ID cookie to it. {name: <string>, value: <string or array>, expires: <date>, domain: <string>, path: <string>, httpOnly: <boolean>, secure: <boolean>}
    session.cookies[config.sessionCookie] = {
      name: config.sessionCookie,
      value: id,
      httpOnly: true,
      notSent: true,
      server: true
    };

    // Save the session to file.
    fs.writeFileSync(session.path, JSON.stringify(session));

    // Return the session ID.
    return session.id;
  };

  /*
   Deletes all expired sessions from the server. This should occur at the end of a request after everything is done and
   the process is about to exist.
   
   TODO: handle exceptions.
  */
  this.cleanUp = function () {
    // Current time used to check if a session has expired.
    var time = new Date().value;

    // Get the time out in milliseconds.
    var timeOut = config.sessionTimeOut * 1000;

    // Get the list of files within the sessions folder.
    var sessions = fs.readdirSync(config.sessionPath);
    for (var index = 0; index < sessions.length; index++) {
      // Build the path and the file information.
      var path = Path.join(config.sessionPath, sessions[index]);
      var stats = fs.statSync(path);

      // If the session has expired then delete the session file.
      if (stats.mtime.value + timeOut < time) {
        fs.unlinkSync(path);
      }
    }
  };

  // Call the constructor.
  this.init();
}

function cgiHttpResponse() {
  var self = this;

  /*
   This is the session object, it is set by the session when it is created.
   This is used to write the cookies to the client when the header is sent.
  */
  this.session = null;

  /*
   Defines if the HTTP headers have already been sent or not. The user can choose to send the 
   headers manually by calling sendHeaders, or it is done automatically the first time the 'write' method
   is called.
  */
  this.isHeaderSent = false;

  /*
   This object defines the list of name/value header of the HTTP headers. These can be manipulated directly
   by the caller. Set, get, remove methods are not required send the caller can access the header object directly.
    For reference purposes, here are the headers operations:
   Set: response.headers[ '<name>' ] = <value>;
   Get: response.headers[ '<name>' ];
   Remove: delete response.headers[ '<name>' ]
  */
  this.headers = {
    'content-type': 'text/html; charset=iso-8859-1'
  };

  /*
   Sends the current response.headers to the client if it has not yet been sent.
   After the header is sent it will not be sent again even if the method is called explicitly. 
   Headers changed within response.headers after the headers have been sent will not be sent.
  */
  this.sendHeaders = function () {
    // If the response has already been send then return;
    if (self.isHeaderSent) {
      return;
    }

    // Set the header as sent and send it.
    self.isHeaderSent = true;

    // Traverse the headers and output them
    for (var name in self.headers) {
      process.stdout.write(name + ':' + self.headers[name] + '\r\n');
    }

    // Traverse the session cookies and send any cookies that has not yet been sent or that has been updated.
    for (var _name in self.session.cookies) {
      var cookie = self.session.cookies[_name];
      if (cookie.notSent === true) {
        delete cookie.notSent;
        process.stdout.write('Set-Cookie:' + cgiParser.serializeCookie(cookie) + '\r\n');
      }
    }

    // Write the final new line.
    process.stdout.write('\r\n');
  };

  /*
   Writes the given string directly to the response output stream.
   If the headers have not yet been sent to the client, then sends them.
  */
  this.write = function (string) {
    // Send the headers if they not have been sent.
    self.sendHeaders();

    // Send the string to the client.
    process.stdout.write(string.toString());
  };
  this.json = function (string) {
    // Send the headers if they not have been sent.
    self.sendHeaders();

    // Send the string to the client.
    process.stdout.write(JSON.stringify(string));
  };

  /*
   Sends any headers if not sent yet and exists the process.
  */
  this.end = function () {
    // If the header was not yet sent then send it.
    self.sendHeaders();

    // End the process.
    process.exit();
  };
}

function cgiHttpRequest() {
  var self = this;

  /*
   This is a URL object as defined by node.js API for URL found here: http://nodejs.org/api/url.html
   The URL is passed in as part of the environment variables 'request_uri'
  */
  this.url = null;

  /*
   The HTTP request method. Could be 'POST' or 'GET' (in upper-case). 
   Passed in as environment variable 'request_method'
  */
  this.method = null;

  /*
   Not sure if anyone ever uses this, but it is the HTTP version pass sent by the client.
   Passed in as environment variable 'server_protocol'
  */
  this.httpVersion = null;

  /*
   The parsed URL query string if any where provided. This is the same as getting it from the 'request.url.query'.
   See URL object for more information: http://nodejs.org/api/url.html
   
   In general (but not necessary), the query is a key/value pair of GET form.
  */
  this.query = {};

  /*
   This is the post object that holds all the different parts of the post data.
   form: The parsed post form data of name/value. If the POST is multi-part then any part with 'Content-Disposition: form-data;' is stored here.
   files: A list of uploaded files. The file object format is: {name: '', filename: '', contentType: '', data: ''}
   isMultiPart: true if content-type contains 'multipart/form-data' within it, otherwise false.
  */
  this.post = {
    form: {},
    files: [],
    parts: [],
    data: '',
    isMultiPart: false
  };

  /*
   This is the server environment variables as provided by 'process.env' except all 'HTTP_' prefixed variables have been
   removed and all names are in lower-case.
  */
  this.server = {};

  /*
   These are the HTTP request headers sent by the client. All the names are lower case and all '-' is replaced by '_'.
   These are extracted from the environment variables, they are passed in with a prefix 'HTTP_' which is stripped out.
  */
  this.headers = {};

  /*
   These are the cookies that are found within the request header.
   Example: request.cookies.name or request.cookies['name']
  */
  this.cookies = {};

  /*
   This object is a concatenation of all the GET (query) and POST form object information.
   This is helpful to access all form field values without having to check if the method is a POST or GET.
  */
  this.form = {};

  /*
   Initializes the HTTP response variables as passed in by the process throw the environment variables
   and the input stream for the post data.
  */
  this.init = function () {
    // Start by parsing the out the environment variables and HTTP headers.
    cgiParser.enviromentVarialbesAndHeaders(process.env, this.server, this.headers);

    // User the server variables to get the rest of the information about the request.
    this.method = process.env.REQUEST_METHOD;
    this.httpVersion = this.server.server_protocol;

    // The content type and length is stored in the server and does not contain the 'http_' prefix.
    // Therefore we are going to manually copy them over.
    this.headers.content_type = this.server.hasOwnProperty('content_type') ? this.server.content_type : '';
    this.headers.content_length = this.server.hasOwnProperty('content_length') ? this.server.content_length : 0;

    // Parse any set cookies into the request.
    if (this.headers.hasOwnProperty('cookie')) {
      this.cookies = cgiParser.cookies(this.headers.cookie);
    }

    // Create the URL object passing it the request URL and then get the get query object from it.
    this.url = url.parse(this.server.request_uri, true);
    this.query = this.url.query;

    // Finally determine if the method is post and if it is multi-part post data.
    self.post.isMultiPart = this.headers.content_type.toLowerCase().indexOf('multipart/form-data') > -1;

    // TODO: we could also parse out the boundary of a multi-part post.
    // TODO: parse the post data if they exist.
  };

  /*
   Reads all the post data from the standard stream.
  */
  this.readPost = function (onFinishedRead, parseData) {
    // Set the optional parameter to the default value.
    if (parseData === undefined) {
      parseData = true;
    }

    // Read any post data before executing the script.
    process.stdin.on('data', function (data) {
      var buffer = new Buffer(data, 'base64');
      self.post.data = buffer.toString();
    });

    // When all the data have been read then invoke the given call back method.
    process.stdin.on('end', function () {
      // If we need to parse the post data before invoking the call back method then do so.
      if (parseData) {
        self.parsePost();
      }

      // If a finished call back is provided then call it.
      if (onFinishedRead) {
        onFinishedRead();
      }
    });
  };

  /*
   Parses the post data and populates the request post object with the data.
  */
  this.parsePost = function () {
    // If the content type is multi-part then use the CGI parser to parse it.
    if (self.post.isMultiPart) {
      cgiParser.multiPart(self.post.data, self.post);
    }

    // Otherwise use the standard query string parser to the parse the post data.
    else {
        self.post.form = queryString.parse(self.post.data);
      }
  };

  // Call the constructor.
  this.init();
}
var cgiParser = {
  /*
   Splits the given file content into the content sections and the source code sections.
    NOTE: This expects a 'response.write' method to exist within the context of the executed code
   and it should have access to '__scripts[id].<script>' array. The caller must place the returned
   content within the __scripts array under the given id. 
    id: is used to identify specific content for a specific script. This provides the ability
   to cash already processed scripts and reuse them without the need to recompile.
    Content: is the string content of the file.
    Returns: an object with the following format: { id: <INTEGER>, path: <STRING>, code: <STRING>, content: [<STRING>] } 
   Where the id is the specified integer id.
   Content is an ordered array of the different content sections of the file that is
   referred to by the source code to be written to the output stream at specific points to
   maintain the flow of the code.
  */
  script: function script(id, path, content) {
    // Set the optional parameters to the default values.
    // TODO: get these from the configuration object.
    var openTag = config.openTag;
    var closeTag = config.closeTag;
    var writePrefix = 'response.write( __scripts[' + id + '].content[';
    var writeSuffix = ']);';

    var script = {
      id: id,
      path: path,
      code: '',
      content: []
    };
    var endIndex = 0;
    var startIndex = 0;

    // Read through all the given content looking for for <? ... ?> or <?= ... ?> sections.
    while (endIndex < content.length) {
      // Find the next index of the start tag.
      endIndex = content.indexOf(openTag, startIndex);

      // If found code section then find the end of it and append it to the blocks.
      if (endIndex >= 0) {
        // If there was content before the start tag then read them first.
        if (endIndex > startIndex) {
          // Append a read command to the source code referencing the current content array location.
          script.code += writePrefix + script.content.length + writeSuffix;

          // Next get the section of data from the section and add to the the content array in the expected location.
          script.content.push(content.slice(startIndex, endIndex));
        }

        // Skip the open tag.
        startIndex = endIndex + openTag.length;

        // If the next character is = then the source code is to be outputted to the stream.
        var writeSection = content[startIndex] == '=' ? startIndex++ : -1;

        // Find the close tag.
        endIndex = content.indexOf(closeTag, startIndex);

        // If end tag exists then capture the block of code and append it to the source.
        if (endIndex >= 0) {
          // If the code block was preceded by '<?=' then encapsulate it with a 'write' call so the result can be written to the output stream.
          if (writeSection > 0) {
            script.code += 'response.write( ' + content.slice(startIndex, endIndex) + ' ); ';
          }

          // Otherwise place the code as is. Ensure there is ';' at the end.
          else {
              script.code += content.slice(startIndex, endIndex) + ';';
            }

          // Move the start index forward past the close tag.
          startIndex = endIndex + closeTag.length;
        }
        // If the close tag was not found then throw exception. TODO: get the line number of start tag for more detailed error reporting.
        else {
            throw new Error("Missing close tag: " + closeTag);
          }
      }
      // If a start tag <? was not found then the rest fo the file is just text content.
      else {
          // Move the end tag to the end of the stream.
          endIndex = content.length;

          // Add a write call to the source code referencing the content array.
          script.code += writePrefix + script.content.length + writeSuffix;
          script.content.push(content.slice(startIndex, endIndex));
        }
    }

    // Finally return script object that contains the source and sections.
    return script;
  },

  /*
   This method traverse the provided environment variables and splits them into the HTTP headers
   and the server environment variables. All variables names will be converted to lower-case.
   
   server: is an output object that will contain the server variables
   headers: is an output object that will contain the HTTP headers.
  */
  enviromentVarialbesAndHeaders: function enviromentVarialbesAndHeaders(envVariables, server, headers) {
    // Traverse the variables and parse them out into server or HTTP header variables.
    for (var name in envVariables) {
      // Get the value and convert the name into lower case to start.
      var value = envVariables[name];
      name = name.toLowerCase();

      // If starts with http then remove 'http_' and add it to the http header array, otherwise add it to the server array.
      if (name.indexOf('http_') === 0) {
        headers[name.substring('http_'.length)] = value;
      } else {
        server[name] = value;
      }
    }
  },

  multiPart: function multiPart(postData, post) {
    if (post === undefined) post = {
      form: {},
      files: {},
      parts: []
    };

    var dataLength = postData.length;
    var endIndex = 0;
    var startIndex = 0;

    // Read the first line until \n, this will be the boundary.
    endIndex = postData.indexOf("\n");
    var boundary = postData.substring(startIndex, endIndex - 1);
    startIndex = endIndex + 1;

    // Split the multi parts into single parts.
    post.parts = postData.split(boundary);

    // Traverse the parts and parse them as if they where a single HTTP header and body.
    for (var index = 0; index < post.parts.length; index++) {}

    // Return the parsed post object.
    return post;
  },

  serializeCookie: function serializeCookie(cookie) {
    // Add the name = value to the cookie.
    var pairs = [cookie.name + '=' + encodeURIComponent(cookie.value)];

    // Add any other fields to the cookie that have been set.
    if (cookie.domain) {
      pairs.push('Domain=' + cookie.domain);
    }
    if (cookie.path) {
      pairs.push('Path=' + cookie.path);
    }
    if (cookie.expires) {
      pairs.push('Expires=' + cookie.expires.toUTCString());
    }
    if (cookie.httpOnly) {
      pairs.push('HttpOnly');
    }

    // Finally return the joint cookie properties.
    return pairs.join('; ');
  },

  cookies: function cookies(string) {
    var pairs = string.split(';');
    var cookies = {};

    for (var index = 0; index < pairs.length; index++) {
      // Get the next pair from the array.
      var pair = pairs[index];

      // Find the first index of '='.
      var indexOfEqual = pair.indexOf('=');

      // If there is no key=value then skip it.
      if (indexOfEqual < 0) {
        continue;
      }

      // Parse out the key and the value.
      var key = pair.substr(0, indexOfEqual).trim();
      var value = pair.substr(indexOfEqual + 1, pair.length).trim();

      // If the value starts with quotes then remove them.
      if (value[0] == '"') {
        value = value.slice(1, -1);
      }

      // Try to decode the value, if exception then just set it. NOTE: if key already exists it will be overwritten.
      try {
        cookies[key] = decodeURIComponent(value);
      } catch (exception) {
        cookies[key] = value;
      }
    }

    // Finally return the cookie object.
    return cookies;
  }

};

// Add the required modules.

// The NodeCGI context.
var cgiNodeContext = null;

/*
 The first thing we are going to do is set up a way to catch any global 
 exceptions and send them to the client. This is extremely helpful when developing code.
*/
var buildError = function buildError(msg, error, stack) {
  // Build the HTML error.
  var style = "color:#E13535;font-family:monaco,monospace;'";
  var htmlError = "<head><style>.body {background-color: #FFF;}</style></head><body><br/><div style=\"" + style + "\"><strong><pre style=\"" + style + "\">" + msg + "</pre></strong>: " + error + " <i><pre style=\"" + style + "\">" + stack + "</pre></i></div></br></body>";
  // If the CGI context has been created then use the response to send the error
  if (cgiNodeContext !== null) {
    cgiNodeContext.response.write(htmlError);
    cgiNodeContext.console.log(process);
  }

  // Otherwise send an HTTP header followed by the error.
  else {
      process.stdout.write("Content-type: text/html; charset=iso-8859-1\n\n" + htmlError);
    }
};
process.on('uncaughtException', function (error) {
  buildError('Uncaught Exception', error.message, error.stack);
});
process.on('unhandledRejection', function (error, p) {
  buildError('Unhandled Rejection at: Promise', JSON.stringify(JSON.decycle(p)), error.stack);
});

/*
 When the process exists make sure to save any session data back to the file.
*/
process.on('exit', function (code) {
  // Save the session back to the file.
  cgiNodeContext.session.save();

  // Clean up any sessions that have expired.
  cgiNodeContext.session.cleanUp();
});

// Create the CGI context and execute the requested file.
cgiNodeContext = node();

// Create a callback function that will get called when everything is loaded and ready to go. This will execute the script.
var onReady = function onReady() {
  cgiNodeContext.include(process.env.PATH_TRANSLATED);
};

// If the HTTP method is a 'POST' then read the post data. Otherwise process is ready.
if (cgiNodeContext.request.method !== 'POST') {
  onReady();
} else {
  cgiNodeContext.request.readPost(onReady);
}