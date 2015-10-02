#!/bin/bash

# Because cordova refuses to generate icons for platforms properly
grep "icon src" config.xml | grep ios | while read l; do
	f=`echo "$l" | cut -d'"' -f 2`
	s=`echo "$l" | cut -d'"' -f 4`
	echo -e "$s\t$f"

	convert www/res/ios/icon.png -resize "${s}x${s}" $f
done

ldpi=36
mdpi=48
hdpi=72
xhdpi=96
xxhdpi=144
xxxhdpi=192

grep "icon src" config.xml | grep android | while read l; do
	f=`echo "$l" | cut -d'"' -f 2`
	r=`echo "$l" | cut -d'"' -f 4`

	s=${!r}
	echo -e "$r\t$s\t$f"

	convert www/res/android/icon.png -resize "${s}x${s}" $f
done
