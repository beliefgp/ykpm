
'use strict';

import 'css/live.less';
import * as Top from 'js/g/top';
// import tpl from '../a.tpl';

class Live {
	constructor() {
		Top.Func1();
		$.ajax({
			type: 'get',
			url: 'http://portal.zb.youku.com/liveportal/getTest1.action',
			data: { testId: 111 },
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
		$('.container').html('11111111');


	}

}



window.live = new Live();
