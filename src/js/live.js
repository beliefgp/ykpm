'use strict';

import '../css/live.less';

class Live {
	constructor(liveId = 0) {
		$.ajax({
			type: 'get',
			url: 'http://portal.zb.youku.com/liveportal/getTest1',
			data: { testId: 1 },
			dataType: 'jsonp',
			jsonp: 'callback',
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
		$('#aa').html('111');


	}

}


var live = new Live();