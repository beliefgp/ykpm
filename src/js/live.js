'use strict';

import '../css/live.less';
import Top from './g/top';
import tpl from './a.tpl';

class Live {
	constructor() {
		console.log(tpl);

		$.ajax({
			type: 'get',
			url: 'http://portal.zb.youku.com/liveportal/getTest1.action',
			data: { testId: 1 },
			dataType: 'jsonp',
			jsonp: 'jsonpcallback',
			success: function (ret) {
				console.log(ret && ret.data);
			}
		});

		$.ajax({
			type: 'get',
			url: 'http://portal.zb.youku.com/liveportal/getTest4.action?ids=387',
			data: { testId: 1 },
			dataType: 'jsonp',
			jsonp: 'jsonpcallback',
			success: function (ret) {
				console.log(ret && ret.data);
			}
		});

		$.ajax({
			type: 'get',
			url: 'http://portal.zb.youku.com/liveportal/getLiveInfo.action?ids=387',
			data: { testId: 1 },
			dataType: 'jsonp',
			jsonp: 'jsoncallback',
			success: function (ret) {
				console.log(ret && ret.data);
			}
		});
	}

	inintStatus() {
		$('#aa').html('122211');


	}

}



window.live = new Live();
