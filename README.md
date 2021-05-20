## cloud-free-subregion

This is a Google Earth Engine application that attempts to find Sentinel-2 images that are cloud-free in a particular subregion. This is especially helpful in equatorial regions where heavy cloud cover means that all images might have high cloud cover. However, some of these images might have clear skies over particular areas of interest. This application helps find those images.

![An example of finding an image without clouds](docs/ex.png)

It can be accessed directly as a [Google Earth Engine application](https://logan.users.earthengine.app/view/simple-sentinel). Click on the map to search for images around that are. Click on thumbnails that appear in the bottom right to add that image to the Google Earth Engine map

### Options

- Search dates: these can be adjusted to select a smaller time range, which will improve performance
- IR False color: check to render IR false color images (helpful for highlighting vegetation, in red)
- Atmospheric corrected: check to find atmospherically corrected images, which will have more accurate colors but are only available since 2018
- Enhance contrast: maximize contrast based on image content, for the entire set of images
- Enhance contrast locally: maximizing contrast for each individual image, based on that images' content
- Limit to one image per month: select one image from each calendar month to display in the bottom right
