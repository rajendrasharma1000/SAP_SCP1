/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
/*eslint-env node, es6 */
"use strict";

let conn = $.hdb.getConnection();
let query =
	`SELECT  "name" as "name",
			"zone" as "zone",
             "state" as "state" FROM "CPL166MTA.cpl166db::copycovidcities" `;
let rs = conn.executeQuery(query);
// let city = conn.executeQuery(query);


// let body = "";
// let body = "["
// for(let item of rs){
// 	// body += item.name + "\t" +
// 	// 		item.continent + "\t" + "\n";
// 	body += "{ name :" +  item.name +  ", continent :" + item.continent + "}"
	
// }

// body += "]"
// $.response.setBody(body);
// $.response.contentType = "application/vnd.ms-excel; charset=utf-16le";
// $.response.headers.set("Content-Disposition",
// 		"attachment; filename=Excel.xls");

$.response.contentType = "application/json";
$.response.setBody(rs);
// $.response.setBody(city);
$.response.status = $.net.http.OK;