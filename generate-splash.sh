#!/bin/bash

echo "www/res/ios/splash/Default.png 320 480
www/res/ios/splash/Default@2x.png 640 960
www/res/ios/splash/Default-568h@2x.png 640 1136
www/res/ios/splash/Default-667h@2x.png 750 1334
www/res/ios/splash/Default-Portrait-736h@3x.png 1242 2208
www/res/ios/splash/Default-Landscape-736h@3x.png 2208 1242
www/res/ios/splash/Default-Portrait.png 768 1024
www/res/ios/splash/Default-Landscape.png 1024 768
www/res/ios/splash/Default-Portrait@2x.png 1536 2048
www/res/ios/splash/Default-Landscape@2x.png 2048 1536
www/res/android/splash/drawable-land-hdpi-screen.png 800 480
www/res/android/splash/drawable-land-ldpi-screen.png 320 200
www/res/android/splash/drawable-land-mdpi-screen.png 480 320
www/res/android/splash/drawable-land-xhdpi-screen.png 1280 720
www/res/android/splash/drawable-land-xxhdpi-screen.png 1600 960
www/res/android/splash/drawable-land-xxxhdpi-screen.png 1920 1280
www/res/android/splash/drawable-port-hdpi-screen.png 480 800
www/res/android/splash/drawable-port-ldpi-screen.png 200 320
www/res/android/splash/drawable-port-mdpi-screen.png 320 480
www/res/android/splash/drawable-port-xhdpi-screen.png 720 1280
www/res/android/splash/drawable-port-xxhdpi-screen.png 960 1600
www/res/android/splash/drawable-port-xxxhdpi-screen.png 1280 1920" | \
while read f w h; do
	echo -e "${f}\t(${w}x${h})"
	rw=$((3 * w / 4))

	android_args=
	if [[ ${f} == *"android"* ]]; then
		convert -background '#f5f5f5' -gravity center -resize "${rw}" www/res/splash.png -bordercolor '#aaaaaa' -border "10x10" -bordercolor none -border "1x1" $f
		ninepatch=${f/png/9.png}
		w9=`identify -ping -format "%w" $f`
		h9=`identify -ping -format "%h" $f`
		top=1
		left=1
		right=$((w9 - 2))
		bottom=$((h9 - 2))
		convert $f \
			-draw "point 1,0" \
			-draw "point $right,0" \
			-draw "point 0,1" \
			-draw "point 0,$bottom" \
			$ninepatch
	else
		convert -background '#aaaaaa' -gravity center -resize "${rw}" www/img/logo-only.svg -extent "${w}x${h}" $f
	fi
done

