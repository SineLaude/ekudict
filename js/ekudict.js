let dictionary, language, re, re_root;
const tables = ["#results_eku", "#results_nat"];
const languages = {
	en:	["English",	"English"],
};
const source_langs = {
	G:	"Germanic",
	S:	"Slavic",
	C:	"Celtic",
	H:	"Greek",
	M:	"Maltese",
	U:	"Uralic",
	B:	"Baltic",
	T:	"Turkish",
	X:	"mixed"
};

$(document).ready(function() {
	$("#searchfield").focus();
	$("#searchfield").on("keypress", function(event) {
		if(event.key === "Enter") {
			event.preventDefault;
			$("#searchbutton").click();
		}
	});

	$("body").on("keydown", function(event) {
		if(event.key === "Tab") {
			event.preventDefault;
			let newLanguage;
			if(!(newLanguage = Object.keys(languages).at(Object.keys(languages).indexOf(language) + (event.shiftKey ? -1 : 1))))
				newLanguage = Object.keys(languages)[0];

			loadDict(newLanguage, true);
		}
	});

	$("body").on("keydown", function() {
		$("#searchfield").focus();
	});

	$("#dictselector").on("change", function() {
		loadDict($( this ).val(), true);
	});

	$("input:checkbox").on("change", function() {
		doSearch(true);
	});

	$(window).on("popstate", function(e) {
		const state = e.originalEvent.state;
		if(state) {
			$("#searchfield").val(state.q);

			if(state.d != language)
				loadDict(state.d, false);
			else
				doSearch(false);
		}
	});

	const sp = new URLSearchParams(location.search);
	if(sp.has("q"))
		$("#searchfield").val(sp.get("q"));

	if(sp.has("d") && sp.get("d") in languages)
		language = sp.get("d");
	else
		language = localStorage.getItem("eku_language");

	if(!language)
		language = "fr";

	history.replaceState({ d: language, q: $("#searchfield").val() }, "", document.location.href);
	loadDict(language, false);
});

function loadDict(lang, history) {
	language = lang;
	Papa.parse("data/eku-" + language + ".csv", {
		download: true,
		header: false,
		skipEmptyLines: true,
		complete: function(results) {
			dictionary = results.data.slice(1);

			if(history)
				pushHistory();

			$(".natlang").text(languages[language][0]);
			$(".natlang_lower").text(languages[language][1]);
			$("#dictselector").val(language);

			localStorage.setItem("eku_language", language);

			doSearch(false);
		}
	});
}

function pushHistory() {
	const url = new URL(location);
	url.searchParams.set("d", language);
	if($("#searchfield").val().length > 0)
		url.searchParams.set("q", $("#searchfield").val());
	else
		if(url.searchParams.has("q"))
			url.searchParams.delete("q");
	history.pushState({ d: language, q: $("#searchfield").val() }, "", url);
}

function insertChar(c) {
	$("#searchfield").val($("#searchfield").val() + c);
}

function rootSearch(root) {
	$("#searchfield").val("root:" + root);
	doSearch(true);
}


function searchEku(entry) {
	return re.test(entry[1]);
}

function searchNat(entry) {
	return re.test(entry[5]);
}

function searchByRoot(entry) {
	return re_root.test(entry[0]);
}

function doSearch(history) {
	$("#searchfield").focus();
	$("#searchfield").select();
	$(".results_table").hide();
	$("#noresults").hide();

	if(history)
		pushHistory();

	const query_raw = $("#searchfield").val();
	const query = query_raw.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*?");

	if(query.length > 0) {
		const results = [[], []]
		re = new RegExp("(^|\\P{L})(" + query + ")($|\\P{L})", "ui");

		if(query.substr(0, 5) == "root:") {
			re_root = new RegExp("^" + query.substr(5) + "$", "ui");
			results[0] = dictionary.filter(searchByRoot);
			results[1] = [];
		}
		else {
			if($("#search_eku").is(":checked"))
				results[0] = dictionary.filter(searchEku);
			if($("#search_nat").is(":checked"))
				results[1] = dictionary.filter(searchNat);
		}

		$(document).prop("title", query_raw + " – Ekumenski Dictionary");

		if(results[0].length > 0 || results[1].length > 0) {
			$(".results_table tr:has(td)").remove();

			const re_start = new RegExp("^" + query + "($|\\P{L})", "ui");
			results.forEach(function(ra, i) {
				if(ra.length > 0) {
					const entries = [[], []];
					ra.sort(function(a, b){return a[1+i*4].toLowerCase() < b[1+i*4].toLowerCase() ? -1 : 1});
					ra.forEach(function(r) {
						if(re_start.test(r[1+i*4]))
							entries[0].push(r);
						else
							entries[1].push(r);
					});
					entries.forEach(function(e) {
						e.forEach(function(r) {
							let info = [];
							info[i] = " <i>" + r[4] + "</i>";
							let origs_str = "";
							if(r[2].length > 0) {
								let origs = [];
								r[2].split(",").forEach(function(o) {
									origs.push(source_langs[o]);
								});
								origs_str = "Origin: " + origs.join(", ");
							}
							if(r[3].length > 0) {
								if(origs_str.length > 0)
									origs_str += "\n";
								origs_str += "Same as in: " + r[3].replace(/[()=]/g, "").replace("UG", "Universalglot").replace("IN", "Interlingue");
							}
							if(origs_str.length > 0)
								info[i] += " <i title=\"" + origs_str + "\" class=\"fa-solid fa-circle-info\"></i>";

							info[i] += "<i title=\"Search for all words with root " + r[0] + "\" onclick=\"rootSearch('" + r[0] + "')\" class=\"rootsearch_button fa-solid fa-magnifying-glass-plus\"></i>";
							info[1-i] = "";

							$(tables[i]).append("<tr><td>" + r[1+i*4].replace(re, "$1<b>$2</b>$3") + info[0] + "</td><td>" + r[5-i*4] + info[1] + "</td></tr>");
						});
					});
					$(tables[i]).show();
				}
			});
		}
		else {
			$("#noresults").show();
		}
	}
	else
		$(document).prop("title", "Ekumenski Dictionary");
}
